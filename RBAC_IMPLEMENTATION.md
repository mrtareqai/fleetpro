# Role-Based Access Control (RBAC) Implementation

## Overview
This document describes the complete RBAC system implemented in the FleetPro Management application.

## Database Schema

### Tables
1. **roles** - Defines system roles (admin, fleet_manager, viewer, etc.)
2. **permissions** - Granular permissions (vehicles.create, users.read, etc.)
3. **role_permissions** - Maps permissions to roles
4. **user_roles** - Assigns roles to users

### Key Features
- System roles cannot be deleted
- Permissions are organized by resource and action
- Many-to-many relationships for flexibility

## Permission System

### Permission Naming Convention
Permissions follow the pattern: `resource.action`

Examples:
- `vehicles.create` - Create vehicles
- `vehicles.read` - View vehicles
- `vehicles.update` - Edit vehicles
- `vehicles.delete` - Delete vehicles
- `users.read` - View users
- `roles.update` - Edit roles

### Wildcard Permissions
- `*` - Super admin with all permissions
- `vehicles.*` - All vehicle permissions
- `users.*` - All user permissions

## Implementation Components

### Server-Side Protection

#### API Middleware (`lib/api-auth.ts`)
- `requireAuth()` - Ensures user is authenticated
- `requirePermission(permission)` - Checks specific permission
- `requireAnyPermission(permissions[])` - Checks if user has any of the permissions

Example usage in API routes:
\`\`\`typescript
export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, "vehicles.create")
  if (authResult instanceof Response) return authResult
  
  // Protected code here
}
\`\`\`

#### Permission Utilities (`lib/permissions.ts`)
- `getUserPermissions(userId)` - Fetches all user permissions from database
- `hasPermission(userPermissions, permission)` - Checks single permission
- `hasAnyPermission(userPermissions, permissions[])` - Checks multiple permissions
- `hasRole(userPermissions, role)` - Checks user role

### Client-Side Protection

#### Auth Context (`lib/auth-context.tsx`)
Provides authentication state and permission checking throughout the app:
- `user` - Current user object
- `permissions` - User's permissions
- `hasPermission(permission)` - Check permission
- `hasAnyPermission(permissions[])` - Check multiple permissions
- `hasRole(role)` - Check role

#### Protected Route Component (`components/protected-route.tsx`)
Wraps entire pages to require authentication and permissions:
\`\`\`typescript
<ProtectedRoute requiredPermission="users.read">
  <UsersPage />
</ProtectedRoute>
\`\`\`

#### Permission Gate Component (`components/permission-gate.tsx`)
Conditionally renders UI elements based on permissions:
\`\`\`typescript
<PermissionGate permission="vehicles.create">
  <Button>Add Vehicle</Button>
</PermissionGate>
\`\`\`

## Admin Interfaces

### User Management (`/admin/users`)
- View all users with their roles
- Create new users and assign roles
- Edit user information and role assignments
- Delete users
- Requires `users.read` permission to access

### Role Management (`/admin/roles`)
- View all roles with permission counts
- Create custom roles with specific permissions
- Edit role permissions
- Delete custom roles (system roles protected)
- Permissions grouped by resource for easy management
- Requires `roles.read` permission to access

## Security Features

1. **Multi-Layer Protection**
   - API routes protected with middleware
   - Pages protected with ProtectedRoute
   - UI elements hidden with PermissionGate

2. **System Role Protection**
   - System roles cannot be deleted
   - Prevents accidental removal of critical roles

3. **Permission Inheritance**
   - Wildcard permissions for admin roles
   - Resource-level wildcards for managers

4. **Mock Data Support**
   - Works with or without database
   - Automatic permission assignment based on user role

## Usage Examples

### Protecting an API Route
\`\`\`typescript
import { requirePermission } from "@/lib/api-auth"

export async function DELETE(request: NextRequest, { params }) {
  const authResult = await requirePermission(request, "vehicles.delete")
  if (authResult instanceof Response) return authResult
  
  // Delete vehicle logic
}
\`\`\`

### Protecting a Page
\`\`\`typescript
export default function VehiclesPage() {
  return (
    <ProtectedRoute requiredPermission="vehicles.read">
      <VehiclesList />
    </ProtectedRoute>
  )
}
\`\`\`

### Conditional UI Rendering
\`\`\`typescript
<PermissionGate permission="vehicles.create">
  <Button onClick={handleCreate}>Add Vehicle</Button>
</PermissionGate>

<PermissionGate permissions={["vehicles.update", "vehicles.delete"]}>
  <ActionButtons />
</PermissionGate>
\`\`\`

### Using Auth Context
\`\`\`typescript
const { hasPermission, hasRole } = useAuth()

if (hasPermission("reports.export")) {
  // Show export button
}

if (hasRole("admin")) {
  // Show admin features
}
\`\`\`

## Default Roles

1. **Super Admin** (`admin`)
   - Permission: `*` (all permissions)
   - Full system access

2. **Fleet Manager** (`fleet_manager`)
   - Permissions: vehicles.*, drivers.*, reservations.*
   - Manage fleet operations

3. **Viewer** (`viewer`)
   - Permissions: *.read
   - Read-only access to all resources

## Testing

To test the RBAC system:

1. Log in as different users (admin, manager, viewer)
2. Verify UI elements appear/disappear based on permissions
3. Try accessing protected routes without permissions
4. Test API endpoints with different permission levels
5. Create custom roles and verify permission enforcement

## Future Enhancements

- Permission caching for performance
- Audit logging for permission changes
- Time-based permissions (temporary access)
- Permission groups for easier management
- API key permissions for external integrations
