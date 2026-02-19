# Super Admin Invite Feature

This feature allows super admins to invite new admins by providing only their email address. The system will assign a default password, and the invited admin must complete their profile (name, phone number, new password) on their first login.

## User Review Required

> [!IMPORTANT]
> **Default Password Configuration**
> The default password for invited admins will be set to `Admin@123`. This can be configured via environment variable `DEFAULT_ADMIN_PASSWORD`. Please confirm if this default password is acceptable or if you'd prefer a different approach (e.g., random password generation, password sent via email).

> [!IMPORTANT]
> **Email Invitation**
> The plan includes optional email notification functionality. Would you like the system to send an invitation email to the admin with their login credentials, or should the super admin manually communicate the credentials?

> [!WARNING]
> **Profile Completion Enforcement**
> Invited admins will be blocked from accessing any protected routes until they complete their profile. This requires middleware to check the `profile_completed` flag on every authenticated request.

## Proposed Changes

### Backend - Database Layer

#### [NEW] Migration: Add Profile Completion Flag
**File**: `acara-backend/database/migrations/YYYY_MM_DD_HHMMSS_add_profile_completed_to_users_table.php`

- Add `profile_completed` boolean field (default: `true` for existing users, `false` for invited admins)
- Add `invited_by` foreign key to track which super admin sent the invitation (nullable)

---

### Backend - Validation Layer

#### [NEW] [AdminInviteRequest.php](file:///Users/farid/Desktop/workspace/acara_project/acara-backend/app/Http/Requests/AdminInviteRequest.php)

- Validate email format and uniqueness
- Ensure only super admins can access this endpoint (via middleware)

#### [NEW] [CompleteProfileRequest.php](file:///Users/farid/Desktop/workspace/acara_project/acara-backend/app/Http/Requests/CompleteProfileRequest.php)

- Validate name, phone_number, password, password_confirmation
- Apply same password strength rules as regular registration

---

### Backend - Service Layer

#### [MODIFY] [AuthService.php](file:///Users/farid/Desktop/workspace/acara_project/acara-backend/app/Services/AuthService.php)

**New Methods:**
- `inviteAdmin(string $email, int $invitedBy): User`
  - Create user with role `admin`, `profile_completed = false`
  - Set default password from config (`DEFAULT_ADMIN_PASSWORD`)
  - Set `invited_by` to super admin's ID
  - Optionally trigger invitation email notification

- `completeProfile(User $user, array $data): User`
  - Update user's name, phone_number, password
  - Set `profile_completed = true`
  - Return updated user

---

### Backend - Controller Layer

#### [MODIFY] [AuthController.php](file:///Users/farid/Desktop/workspace/acara_project/acara-backend/app/Http/Controllers/AuthController.php)

**New Endpoints:**
- `POST /api/admin/invite` - Invite admin (super admin only)
  - Accepts: `{ email: string }`
  - Returns: `{ message: string, user: User }`
  
- `POST /api/profile/complete` - Complete profile (authenticated, incomplete profile only)
  - Accepts: `{ name: string, phone_number: string, password: string, password_confirmation: string }`
  - Returns: `{ message: string, user: User }`

**Modified Endpoint:**
- `POST /api/login` - Add `profile_completed` flag to response
  - Return `profile_completed: false` if user needs to complete profile
  - Frontend will redirect to profile completion page

---

### Backend - Middleware

#### [NEW] [EnsureProfileCompleted.php](file:///Users/farid/Desktop/workspace/acara_project/acara-backend/app/Http/Middleware/EnsureProfileCompleted.php)

- Check if authenticated user has `profile_completed = false`
- If incomplete, return 403 with message: "Please complete your profile"
- Apply to all protected routes except `/api/profile/complete` and `/api/logout`

---

### Backend - Routes

#### [MODIFY] [api.php](file:///Users/farid/Desktop/workspace/acara_project/acara-backend/routes/api.php)

```php
// Super admin routes
Route::middleware(['auth:sanctum', 'role:super_admin'])->group(function () {
    Route::post('/admin/invite', [AuthController::class, 'inviteAdmin']);
});

// Profile completion (no profile check middleware)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/profile/complete', [AuthController::class, 'completeProfile']);
});

// Protected routes (require completed profile)
Route::middleware(['auth:sanctum', 'profile.completed'])->group(function () {
    // Existing protected routes...
});
```

---

### Backend - Notifications (Optional)

#### [NEW] [AdminInviteNotification.php](file:///Users/farid/Desktop/workspace/acara_project/acara-backend/app/Notifications/AdminInviteNotification.php)

- Email template with login URL and default credentials
- Only created if email invitation is desired

---

### Frontend - API Layer

#### [NEW] [adminApi.ts](file:///Users/farid/Desktop/workspace/acara_project/acara-frontend/src/features/admin/api.ts)

```typescript
export const inviteAdmin = async (email: string) => {
  const response = await api.post('/admin/invite', { email });
  return response.data;
};

export const completeProfile = async (data: CompleteProfileData) => {
  const response = await api.post('/profile/complete', data);
  return response.data;
};
```

---

### Frontend - Admin Invite Page

#### [MODIFY] [Register_admin.tsx](file:///Users/farid/Desktop/workspace/acara_project/acara-frontend/src/features/register_admin/pages/Register_admin.tsx)

- Create form with single email input field
- Add submit button "Send Invitation"
- Display success message after invitation sent
- Show default password to super admin (so they can communicate it)
- Add validation for email format
- Handle loading and error states

**Design:**
- Match existing auth page styling (purple theme, clean layout)
- Show invitation history/list (optional enhancement)

---

### Frontend - Profile Completion Page

#### [NEW] [CompleteProfile.tsx](file:///Users/farid/Desktop/workspace/acara_project/acara-frontend/src/features/auth/pages/CompleteProfile.tsx)

- Form fields: Full Name, Phone Number, New Password, Confirm Password
- Password strength indicator (reuse from Register.tsx)
- Submit button "Complete Profile"
- Cannot be skipped or closed (modal or full-page)
- Redirect to dashboard after successful completion

---

### Frontend - Login Flow Update

#### [MODIFY] [Login.tsx](file:///Users/farid/Desktop/workspace/acara_project/acara-frontend/src/features/auth/pages/Login.tsx)

- Check `profile_completed` flag in login response
- If `false`, redirect to `/complete-profile` instead of dashboard
- Store user data in context/state for profile completion page

---

### Frontend - Routing

#### [MODIFY] App routing configuration

- Add route: `/admin/invite` → `Register_admin.tsx` (super admin only)
- Add route: `/complete-profile` → `CompleteProfile.tsx` (authenticated, incomplete profile only)
- Add route guard to prevent access to other pages if profile incomplete

---

## Verification Plan

### Automated Tests

**Backend API Tests** (if test suite exists):
```bash
cd acara-backend
php artisan test --filter AdminInviteTest
```

If no test suite exists, manual API testing will be performed using the browser.

### Manual Verification

1. **Super Admin Invite Flow**
   - Login as super admin
   - Navigate to `/admin/invite` page
   - Enter a new email address
   - Submit form
   - Verify success message appears
   - Verify default password is displayed

2. **Admin First Login**
   - Logout from super admin
   - Login with invited admin email and default password (`Admin@123`)
   - Verify redirect to profile completion page
   - Verify cannot access other pages without completing profile

3. **Profile Completion**
   - Fill in: Full Name, Phone Number, New Password (meeting strength requirements)
   - Submit form
   - Verify redirect to dashboard
   - Verify can now access all admin features

4. **Profile Completion Validation**
   - Test with weak password → should show validation errors
   - Test with mismatched passwords → should show error
   - Test with missing fields → should show required field errors

5. **Email Invitation** (if implemented)
   - Check email inbox for invitation
   - Verify email contains login URL and credentials
   - Click link and verify redirect to login page

### Browser Testing

I will use the browser tool to:
- Test the complete user flow from invitation to profile completion
- Verify UI/UX matches existing design patterns
- Test form validation and error handling
- Capture screenshots for the walkthrough document
