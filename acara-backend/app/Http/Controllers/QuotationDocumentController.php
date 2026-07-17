<?php

namespace App\Http\Controllers;

use App\Models\Quotation;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class QuotationDocumentController extends Controller
{
    public function download(Request $request, int $bookingId, int $quotationId)
    {
        $quotation = Quotation::query()
            ->whereKey($quotationId)
            ->where('booking_id', $bookingId)
            ->with([
                'items',
                'booking.user',
                'booking.brief',
                'booking.serviceProfile.user.vendorProfile',
            ])
            ->firstOrFail();

        $booking = $quotation->booking;
        $user = $request->user();
        $isAdministrator = in_array($user->role, ['admin', 'super_admin'], true);
        $isOrganizer = $booking->user_id === $user->id;
        $isVendor = $booking->serviceProfile?->user_id === $user->id;

        abort_unless($isAdministrator || $isOrganizer || $isVendor, 404);

        $vendorUser = $booking->serviceProfile?->user;
        $vendorProfile = $vendorUser?->vendorProfile;
        $logoPath = resource_path('images/acara-logo.png');
        $logoDataUri = file_exists($logoPath)
            ? 'data:image/png;base64,'.base64_encode((string) file_get_contents($logoPath))
            : null;

        $document = Pdf::loadView('pdf.quotation', [
            'quotation' => $quotation,
            'booking' => $booking,
            'brief' => $booking->brief,
            'organizer' => $booking->user,
            'vendor' => $vendorUser,
            'vendorProfile' => $vendorProfile,
            'logoDataUri' => $logoDataUri,
        ])
            ->setPaper('a4', 'portrait')
            ->setOption('defaultFont', 'DejaVu Sans')
            ->setOption('isPhpEnabled', true);

        return $document->download($quotation->reference().'.pdf');
    }
}
