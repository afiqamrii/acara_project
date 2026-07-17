<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\BookingMessage;
use App\Models\User;
use App\Models\UserNotification;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BookingMessageController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function vendorConversations(Request $request)
    {
        $vendorId = $request->user()->id;
        $bookings = Booking::query()
            ->with([
                'user:id,name',
                'serviceProfile:id,service_name',
                'latestMessage.sender:id,name,role',
            ])
            ->withCount([
                'messages as message_count',
                'messages as unread_message_count' => fn ($query) => $query
                    ->where('sender_id', '!=', $vendorId)
                    ->whereNull('read_at'),
            ])
            ->whereHas('serviceProfile', fn ($query) => $query->where('user_id', $vendorId))
            ->where('status', '!=', 'cart')
            ->where(function ($query) {
                $query->whereIn('status', ['pending', 'confirmed'])
                    ->orWhereHas('messages');
            })
            ->orderByDesc('unread_message_count')
            ->orderByDesc('message_count')
            ->orderByDesc('updated_at')
            ->get()
            ->map(function (Booking $booking) use ($vendorId) {
                $latestMessage = $booking->latestMessage;

                return [
                    'booking_id' => $booking->id,
                    'booking_reference' => 'ACR-'.str_pad((string) $booking->id, 6, '0', STR_PAD_LEFT),
                    'service_name' => $booking->service_name_snapshot ?: $booking->serviceProfile->service_name,
                    'selected_date' => $booking->selected_date->format('Y-m-d'),
                    'status' => $booking->completion_status ?: $booking->status,
                    'customer' => [
                        'id' => $booking->user->id,
                        'name' => $booking->user->name,
                    ],
                    'message_count' => (int) $booking->message_count,
                    'unread_message_count' => (int) $booking->unread_message_count,
                    'last_message' => $latestMessage ? [
                        'message' => $latestMessage->message,
                        'sender_name' => $latestMessage->sender->name,
                        'is_mine' => $latestMessage->sender_id === $vendorId,
                        'created_at' => $latestMessage->created_at->toDateTimeString(),
                    ] : null,
                ];
            });

        return response()->json([
            'conversations' => $bookings,
            'unread_count' => $bookings->sum('unread_message_count'),
        ]);
    }

    public function index(Request $request, int $id)
    {
        $booking = $this->accessibleBooking($request->user(), $id);

        if (! $booking) {
            return response()->json(['message' => 'Booking conversation not found.'], 404);
        }

        $role = $this->participantRole($booking, $request->user());
        $messages = $booking->messages()
            ->with('sender:id,name,role')
            ->oldest('id')
            ->get();

        return response()->json([
            'booking' => [
                'id' => $booking->id,
                'reference' => 'ACR-'.str_pad((string) $booking->id, 6, '0', STR_PAD_LEFT),
                'status' => $booking->completion_status ?: $booking->status,
            ],
            'messages' => $messages
                ->map(fn (BookingMessage $message) => $message->toApiArray($request->user()->id))
                ->values(),
            'participant_role' => $role,
            'can_send' => in_array($role, ['organizer', 'vendor'], true)
                && in_array($booking->status, ['pending', 'confirmed'], true),
            'read_only_reason' => $this->readOnlyReason($booking, $role),
            'unread_count' => in_array($role, ['organizer', 'vendor'], true)
                ? $messages->where('sender_id', '!=', $request->user()->id)->whereNull('read_at')->count()
                : 0,
        ]);
    }

    public function store(Request $request, int $id)
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $result = DB::transaction(function () use ($request, $id, $validated) {
            $booking = Booking::with(['serviceProfile', 'user', 'brief'])
                ->where('id', $id)
                ->where('status', '!=', 'cart')
                ->lockForUpdate()
                ->first();

            if (! $booking) {
                return 'not_found';
            }

            $role = $this->participantRole($booking, $request->user());

            if (! in_array($role, ['organizer', 'vendor'], true)) {
                return $role === 'admin' ? 'forbidden' : 'not_found';
            }

            if (! in_array($booking->status, ['pending', 'confirmed'], true)) {
                return 'read_only';
            }

            $recipientId = $role === 'organizer'
                ? $booking->serviceProfile->user_id
                : $booking->user_id;

            if ($recipientId === $request->user()->id) {
                return 'forbidden';
            }

            $message = $booking->messages()->create([
                'sender_id' => $request->user()->id,
                'message' => trim($validated['message']),
            ]);
            $message->load('sender:id,name,role');

            $recipient = User::findOrFail($recipientId);
            $this->notifications->bookingMessage($booking, $message, $request->user(), $recipient);

            return $message;
        });

        if ($result === 'not_found') {
            return response()->json(['message' => 'Booking conversation not found.'], 404);
        }

        if ($result === 'forbidden') {
            return response()->json(['message' => 'Only the organizer and vendor can send booking messages.'], 403);
        }

        if ($result === 'read_only') {
            return response()->json(['message' => 'This booking conversation is read-only because the booking is closed.'], 409);
        }

        return response()->json([
            'message' => 'Message sent.',
            'booking_message' => $result->toApiArray($request->user()->id),
        ], 201);
    }

    public function markRead(Request $request, int $id)
    {
        $booking = $this->accessibleBooking($request->user(), $id);

        if (! $booking) {
            return response()->json(['message' => 'Booking conversation not found.'], 404);
        }

        $role = $this->participantRole($booking, $request->user());
        if (! in_array($role, ['organizer', 'vendor'], true)) {
            return response()->json(['message' => 'Only booking participants can update message read status.'], 403);
        }

        $updated = DB::transaction(function () use ($booking, $request) {
            $updated = BookingMessage::where('booking_id', $booking->id)
                ->where('sender_id', '!=', $request->user()->id)
                ->whereNull('read_at')
                ->update(['read_at' => now(), 'updated_at' => now()]);

            UserNotification::where('user_id', $request->user()->id)
                ->where('booking_id', $booking->id)
                ->where('type', 'booking_message')
                ->whereNull('read_at')
                ->update(['read_at' => now(), 'updated_at' => now()]);

            return $updated;
        });

        return response()->json([
            'message' => 'Conversation marked as read.',
            'updated' => $updated,
            'unread_count' => 0,
        ]);
    }

    private function accessibleBooking(User $user, int $id): ?Booking
    {
        $booking = Booking::with(['serviceProfile', 'user', 'brief'])
            ->where('id', $id)
            ->where('status', '!=', 'cart')
            ->first();

        if (! $booking || ! $this->participantRole($booking, $user)) {
            return null;
        }

        return $booking;
    }

    private function participantRole(Booking $booking, User $user): ?string
    {
        if ($booking->user_id === $user->id) {
            return 'organizer';
        }

        if ($booking->serviceProfile->user_id === $user->id) {
            return 'vendor';
        }

        if (in_array($user->role, ['admin', 'super_admin'], true)) {
            return 'admin';
        }

        return null;
    }

    private function readOnlyReason(Booking $booking, ?string $role): ?string
    {
        if ($role === 'admin') {
            return 'Administrators can review this transcript but cannot participate in the conversation.';
        }

        if (! in_array($booking->status, ['pending', 'confirmed'], true)) {
            return 'This conversation is read-only because the booking is closed.';
        }

        return null;
    }
}
