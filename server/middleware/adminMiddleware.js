/**
 * verifyAdmin middleware — must be placed AFTER the `protect` middleware.
 *
 * Checks the decoded JWT payload on `req.user` for `role === 'admin'`.
 * Returns 403 Forbidden if the user is not an admin.
 */
const verifyAdmin = (req, res, next) => {
    if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
    }
    next();
};

module.exports = verifyAdmin;
