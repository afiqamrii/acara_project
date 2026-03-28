<?php

namespace App\Http\Controllers;

use App\Models\ServiceProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ServiceController extends Controller
{
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'service_name' => 'required|string|max:255',
            'service_category' => 'required|string|max:255',
            'service_details' => 'required|string',
            'pricing_starting_from' => 'required|numeric',
            'pricing_unit' => 'required|string|max:255',
            'pricing_description' => 'nullable|string',
            'portfolio' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $timestamp = now()->format('Ymd_His');
            $slugName = \Illuminate\Support\Str::slug($request->service_name);

            $portfolioPath = null;
            if ($request->hasFile('portfolio')) {
                $extension = $request->file('portfolio')->getClientOriginalExtension();
                $filename = "{$slugName}_portfolio_{$timestamp}.{$extension}";
                $portfolioPath = $request->file('portfolio')->storeAs('service_portfolios', $filename, 'public');
            }

            $serviceProfile = ServiceProfile::create([
                'user_id' => $request->user()->id,
                'service_name' => $request->service_name,
                'service_category' => $request->service_category,
                'service_details' => $request->service_details,
                'pricing_starting_from' => $request->pricing_starting_from,
                'pricing_unit' => $request->pricing_unit,
                'pricing_description' => $request->pricing_description,
                'portfolio_path' => $portfolioPath,
                'status' => 'pending_verification',
            ]);

            return response()->json([
                'message' => 'Service application submitted successfully',
                'data' => $serviceProfile,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create service profile',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
