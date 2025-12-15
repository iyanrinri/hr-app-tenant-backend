import { SetMetadata } from '@nestjs/common';

export type Role = 'SUPER' | 'HR' | 'MANAGER' | 'EMPLOYEE';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
