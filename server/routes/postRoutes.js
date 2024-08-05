const { Router } = require("express");

const {
  createPost,
  getPosts,
  getPost,
  getCatPost,
  getUserPosts,
  editPost,
  deletePost,
} = require("../controllers/postControllers");

const authMiddleware = require("../middleware/authMiddleware");

const router = Router();

// Define routes
router.post("/", authMiddleware, createPost); // Create a new post
router.get("/", getPosts); // Get all posts
router.get("/:id", getPost); // Get a post by ID
router.get("/categories/:category", getCatPost); // Get posts by category
router.get("/users/:id", getUserPosts); // Get posts by user ID
router.patch("/:id", authMiddleware, editPost); // Edit a post by ID
router.delete("/:id", authMiddleware, deletePost); // Delete a post by ID

module.exports = router;
