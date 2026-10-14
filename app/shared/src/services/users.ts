import type { UserListItem } from '../api/contract';
import type { SqlDriver } from '../db/driver';

export function listUsers(db: SqlDriver): UserListItem[] {
  return db
    .all<{ id: string; username: string; fullName: string; role: UserListItem['role']; active: number }>(
      `SELECT id, username, full_name AS fullName, role, active FROM users
       WHERE deleted_at IS NULL ORDER BY role = 'admin' DESC, full_name`,
    )
    .map((u) => ({ ...u, active: u.active === 1 }));
}
