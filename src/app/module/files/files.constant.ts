// Documents the admin issues to the user after the return is filed. These are
// shown on the user's "Tax Documents" page instead of "My Files". This list is
// the single source of truth — the admin upload modal fetches it from
// GET /files/admin-issued-types. Adding a type here is all that is needed;
// renaming one orphans existing rows unless the old name is kept too.
export const ADMIN_ISSUED_FILE_TYPES = ['Acknowledgement', 'Tax Certificate'];
