<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ $quotation->reference() }} - Acara Quotation</title>
    <style>
        @page { margin: 36px 42px 50px; }
        body {
            margin: 0;
            color: #172033;
            font-family: "DejaVu Sans", sans-serif;
            font-size: 10px;
            line-height: 1.45;
        }
        .header-table, .summary-table, .party-table, .meta-table, .items-table, .totals-table, .event-table {
            width: 100%;
            border-collapse: collapse;
        }
        .header-table td { vertical-align: top; }
        .logo { width: 178px; height: 68px; }
        .wordmark {
            color: #202747;
            font-size: 25px;
            font-weight: 700;
            letter-spacing: -1px;
        }
        .wordmark-dot { color: #6d4aff; }
        .document-label {
            color: #5b6475;
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 1.4px;
            text-transform: uppercase;
        }
        .document-title {
            margin-top: 5px;
            color: #141b33;
            font-size: 25px;
            font-weight: 700;
            letter-spacing: .2px;
        }
        .reference {
            margin-top: 5px;
            color: #4f46e5;
            font-size: 11px;
            font-weight: 700;
        }
        .rule {
            height: 4px;
            margin: 18px 0 16px;
            border-radius: 2px;
            background: #4338ca;
        }
        .summary-table td {
            width: 25%;
            padding: 10px 11px;
            border: 1px solid #e3e7ef;
            vertical-align: top;
        }
        .summary-table td + td { border-left: 0; }
        .label {
            color: #7a8496;
            font-size: 7.5px;
            font-weight: 700;
            letter-spacing: .8px;
            text-transform: uppercase;
        }
        .value {
            margin-top: 4px;
            color: #182033;
            font-size: 10px;
            font-weight: 700;
        }
        .status {
            display: inline-block;
            padding: 3px 7px;
            border: 1px solid #c7d2fe;
            border-radius: 10px;
            background: #eef2ff;
            color: #3730a3;
            font-size: 8px;
            font-weight: 700;
        }
        .section { margin-top: 18px; }
        .section-title {
            margin: 0 0 8px;
            color: #29324a;
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
        }
        .party-table td {
            width: 50%;
            padding: 12px 14px;
            border: 1px solid #e3e7ef;
            vertical-align: top;
        }
        .party-table td + td { border-left: 0; }
        .party-name {
            margin-top: 5px;
            color: #141b33;
            font-size: 12px;
            font-weight: 700;
        }
        .party-detail { margin-top: 3px; color: #5d6778; }
        .meta-table td {
            width: 50%;
            padding: 8px 10px;
            border-bottom: 1px solid #edf0f5;
            vertical-align: top;
        }
        .meta-table tr:first-child td { border-top: 1px solid #edf0f5; }
        .meta-table td:nth-child(odd) { border-left: 1px solid #edf0f5; }
        .meta-table td:nth-child(even) { border-right: 1px solid #edf0f5; }
        .event-table td {
            width: 33.33%;
            padding: 8px 10px;
            border: 1px solid #edf0f5;
            vertical-align: top;
        }
        .event-table tr + tr td { border-top: 0; }
        .event-table td + td { border-left: 0; }
        .items-table { table-layout: fixed; }
        .items-table th {
            padding: 9px 8px;
            background: #202747;
            color: #ffffff;
            font-size: 8px;
            letter-spacing: .6px;
            text-align: left;
            text-transform: uppercase;
        }
        .items-table td {
            padding: 9px 8px;
            border-bottom: 1px solid #e7eaf0;
            color: #394256;
            vertical-align: top;
            overflow-wrap: break-word;
        }
        .items-table tbody tr:nth-child(even) td { background: #f8f9fc; }
        .items-table tr { page-break-inside: avoid; }
        .num { text-align: right !important; }
        .item-description { width: 52%; }
        .item-qty { width: 10%; }
        .item-price, .item-amount { width: 19%; }
        .totals-wrap { margin-top: 10px; }
        .totals-spacer { width: 55%; }
        .totals-cell { width: 45%; }
        .totals-table td { padding: 4px 2px; }
        .totals-table .total-row td {
            padding-top: 8px;
            border-top: 2px solid #202747;
            color: #141b33;
            font-size: 13px;
            font-weight: 700;
        }
        .discount { color: #047857; }
        .note-box {
            margin-top: 8px;
            padding: 10px 12px;
            border: 1px solid #e3e7ef;
            border-radius: 5px;
            background: #fafbfe;
            color: #4d5668;
            page-break-inside: avoid;
            overflow-wrap: break-word;
        }
        .response-box {
            border-color: #c7d2fe;
            background: #f4f5ff;
        }
        .legal-note {
            margin-top: 18px;
            padding: 10px 12px;
            border-left: 3px solid #c8a45f;
            background: #fbfaf7;
            color: #626979;
            font-size: 8.5px;
        }
    </style>
</head>
<body>
    <table class="header-table">
        <tr>
            <td style="width: 52%;">
                @if ($logoDataUri)
                    <img class="logo" src="{{ $logoDataUri }}" alt="Acara">
                @else
                    <div class="wordmark">Acara<span class="wordmark-dot">.</span></div>
                @endif
            </td>
            <td style="width: 48%; text-align: right;">
                <div class="document-label">Commercial document</div>
                <div class="document-title">QUOTATION</div>
                <div class="reference">{{ $quotation->reference() }}</div>
            </td>
        </tr>
    </table>

    <div class="rule"></div>

    <table class="summary-table">
        <tr>
            <td>
                <div class="label">Version</div>
                <div class="value">Version {{ $quotation->version }}</div>
            </td>
            <td>
                <div class="label">Issued</div>
                <div class="value">{{ $quotation->sent_at?->format('d M Y') ?? '-' }}</div>
            </td>
            <td>
                <div class="label">Valid until</div>
                <div class="value">{{ $quotation->valid_until?->format('d M Y') ?? '-' }}</div>
            </td>
            <td>
                <div class="label">Status</div>
                <div class="value"><span class="status">{{ strtoupper(str_replace('_', ' ', $quotation->status)) }}</span></div>
            </td>
        </tr>
    </table>

    <div class="section">
        <div class="section-title">Prepared for and issued by</div>
        <table class="party-table">
            <tr>
                <td>
                    <div class="label">Organizer</div>
                    <div class="party-name">{{ $organizer?->name ?? 'Organizer' }}</div>
                    <div class="party-detail">{{ $organizer?->email ?? '-' }}</div>
                    @if ($organizer?->phone_number)
                        <div class="party-detail">{{ $organizer->phone_number }}</div>
                    @endif
                </td>
                <td>
                    <div class="label">Vendor</div>
                    <div class="party-name">{{ $vendorProfile?->business_name ?: ($vendor?->name ?? $booking->vendor_name_snapshot) }}</div>
                    <div class="party-detail">{{ $vendor?->email ?? '-' }}</div>
                    @if ($vendor?->phone_number)
                        <div class="party-detail">{{ $vendor->phone_number }}</div>
                    @endif
                    @if ($vendorProfile?->ssm_number)
                        <div class="party-detail">SSM: {{ $vendorProfile->ssm_number }}</div>
                    @endif
                    @if ($vendorProfile?->service_area_town || $vendorProfile?->service_area_state)
                        <div class="party-detail">{{ collect([$vendorProfile?->service_area_town, $vendorProfile?->service_area_state])->filter()->join(', ') }}</div>
                    @endif
                </td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Booking and service</div>
        <table class="meta-table">
            <tr>
                <td><span class="label">Booking reference</span><div class="value">ACR-{{ str_pad((string) $booking->id, 6, '0', STR_PAD_LEFT) }}</div></td>
                <td><span class="label">Event date</span><div class="value">{{ $booking->selected_date?->format('d M Y') ?? '-' }}</div></td>
            </tr>
            <tr>
                <td><span class="label">Service</span><div class="value">{{ $booking->service_name_snapshot }}</div></td>
                <td><span class="label">Category</span><div class="value">{{ $booking->serviceProfile?->service_category ?? '-' }}</div></td>
            </tr>
        </table>
    </div>

    @if ($brief)
        <div class="section">
            <div class="section-title">Event scope</div>
            <table class="event-table">
                <tr>
                    <td><span class="label">Event</span><div class="value">{{ $brief->event_title }}</div></td>
                    <td><span class="label">Type</span><div class="value">{{ $brief->event_type }}</div></td>
                    <td><span class="label">Estimated guests</span><div class="value">{{ $brief->guest_count ?? '-' }}</div></td>
                </tr>
                <tr>
                    <td><span class="label">Schedule</span><div class="value">{{ $brief->start_time }}{{ $brief->end_time ? ' - '.$brief->end_time : '' }}</div></td>
                    <td><span class="label">Venue</span><div class="value">{{ $brief->venue_name }}</div></td>
                    <td><span class="label">Vendor setup</span><div class="value">{{ $brief->setup_time ?: '-' }}</div></td>
                </tr>
                <tr>
                    <td colspan="2"><span class="label">Venue address</span><div class="value">{{ $brief->venue_address }}</div></td>
                    <td><span class="label">On-day contact</span><div class="value">{{ $brief->contact_name }}<br>{{ $brief->contact_phone }}</div></td>
                </tr>
            </table>
            @if ($brief->requirements)
                <div class="note-box"><span class="label">Additional requirements</span><br>{!! nl2br(e($brief->requirements)) !!}</div>
            @endif
        </div>
    @endif

    <div class="section">
        <div class="section-title">Quotation items</div>
        <table class="items-table">
            <thead>
                <tr>
                    <th class="item-description">Description</th>
                    <th class="item-qty num">Qty</th>
                    <th class="item-price num">Unit price</th>
                    <th class="item-amount num">Amount</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($quotation->items as $item)
                    <tr>
                        <td>{{ $item->description }}</td>
                        <td class="num">{{ rtrim(rtrim(number_format((float) $item->quantity, 2, '.', ''), '0'), '.') }}</td>
                        <td class="num">RM {{ number_format((float) $item->unit_price, 2) }}</td>
                        <td class="num"><strong>RM {{ number_format((float) $item->amount, 2) }}</strong></td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <table class="totals-wrap" style="width: 100%; border-collapse: collapse;">
            <tr>
                <td class="totals-spacer"></td>
                <td class="totals-cell">
                    <table class="totals-table">
                        <tr><td>Subtotal</td><td class="num">RM {{ number_format((float) $quotation->subtotal, 2) }}</td></tr>
                        @if ((float) $quotation->discount_amount > 0)
                            <tr class="discount"><td>Discount</td><td class="num">- RM {{ number_format((float) $quotation->discount_amount, 2) }}</td></tr>
                        @endif
                        @if ((float) $quotation->tax_amount > 0)
                            <tr><td>Tax ({{ rtrim(rtrim(number_format((float) $quotation->tax_rate, 2, '.', ''), '0'), '.') }}%)</td><td class="num">RM {{ number_format((float) $quotation->tax_amount, 2) }}</td></tr>
                        @endif
                        <tr class="total-row"><td>Total</td><td class="num">RM {{ number_format((float) $quotation->total_amount, 2) }}</td></tr>
                    </table>
                </td>
            </tr>
        </table>
    </div>

    @if ($quotation->vendor_notes || $quotation->terms || $quotation->response_note)
        <div class="section">
            <div class="section-title">Notes and terms</div>
            @if ($quotation->vendor_notes)
                <div class="note-box"><span class="label">Vendor note</span><br>{!! nl2br(e($quotation->vendor_notes)) !!}</div>
            @endif
            @if ($quotation->terms)
                <div class="note-box"><span class="label">Terms and conditions</span><br>{!! nl2br(e($quotation->terms)) !!}</div>
            @endif
            @if ($quotation->response_note)
                <div class="note-box response-box"><span class="label">Organizer response</span><br>{!! nl2br(e($quotation->response_note)) !!}</div>
            @endif
        </div>
    @endif

    <div class="legal-note">
        This quotation records the commercial terms proposed through Acara for the referenced booking. It is not a tax invoice, receipt, or proof of payment. Payment handling is outside the scope of this document.
    </div>

    <script type="text/php">
        if (isset($pdf)) {
            $font = $fontMetrics->getFont('DejaVu Sans', 'normal');
            $pdf->line(42, 797, 553, 797, array(0.89, 0.91, 0.94), 0.6);
            $pdf->page_text(42, 807, 'Generated by Acara - {{ $quotation->reference() }}', $font, 7.5, array(0.53, 0.56, 0.63));
            $pdf->page_text(508, 810, 'Page {PAGE_NUM} of {PAGE_COUNT}', $font, 7.5, array(0.53, 0.56, 0.63));
        }
    </script>
</body>
</html>
