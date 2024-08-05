const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");

const User = require("../models/userModel");
const HttpError = require("../models/errorModel");
const { Error } = require("mongoose");
const { randomUUID } = require("crypto");

// ================ REGISTER NEW USER =====================
// POST : api/users/register
// UNPROTECTED

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, password2 } = req.body;

    // Check if any of the required fields are missing
    if (!name || !email || !password || !password2) {
      return next(new HttpError("Fill in all fields", 422));
    }

    // Convert email to lowercase
    const newEmail = email.toLowerCase();

    // Check if email already exists
    const emailExists = await User.findOne({ email: newEmail });
    if (emailExists) {
      return next(new HttpError("Email already exists", 422));
    }

    // Check password length
    if (password.trim().length < 6) {
      return next(
        new HttpError("Password should be at least 6 characters", 422)
      );
    }

    // Check if passwords match
    if (password !== password2) {
      return next(new HttpError("Passwords do not match", 422));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(password, salt);
    const newUser = await User.create({
      name,
      email: newEmail,
      password: hashedPass,
    });
    res.status(201).json({ email: newUser.email, message: "registered" });
  } catch (error) {
    return next(new HttpError("User Registration Failed", 422));
  }
};

// ================ LOGIN A REGISTERED USER =====================
// POST : api/users/login
// UNPROTECTED
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new HttpError("Fill in all fields", 422));
    }
    const newEmail = email.toLowerCase();

    const user = await User.findOne({ email: newEmail });
    if (!user) {
      return next(new HttpError("Invalid credentials", 422));
    }

    const comparePass = await bcrypt.compare(password, user.password);
    if (!comparePass) {
      return next(new HttpError("Invalid credentials", 422));
    }

    const { _id: id, name } = user;
    const token = jwt.sign({ id, name }, process.env.JWT_SECRET, {
      expiresIn: "1d", // Corrected expiresIn value
    });

    res.status(200).json({ token, id, name });
  } catch (error) {
    return next(
      new HttpError("Login failed, please check your credentials", 422)
    );
  }
};
// ================ USER PROFILE=====================
// POST : api/users/:id
// PROTECTED
const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");

    if (!user) {
      return next(new HttpError("User not found.", 404));
    }

    res.status(200).json(user);
  } catch (error) {
    return next(new HttpError(error.message, 500));
  }
};

// ================ CHANGE USER AVATAR(profile picture)=====================
// POST : api/users/change-avatar
// PROTECTED

const changeAvatar = async (req, res, next) => {
  try {
    if (!req.files || !req.files.avatar) {
      return next(new HttpError("Please choose an image.", 422));
    }

    // Find user from database
    const user = await User.findById(req.user.id);

    // Delete old avatar if it exists
    if (user.avatar) {
      const avatarPath = path.join(__dirname, "..", "uploads", user.avatar);
      fs.unlink(avatarPath, (err) => {
        if (err) {
          return next(new HttpError(err.message, 500));
        }
      });
    }

    const { avatar } = req.files;
    // check file size
    if (avatar.size > 50000) {
      return next(
        new HttpError("File size is too large. Should be less than 500kb", 422)
      );
    }

    let fileName = avatar.name;
    let splittedFilename = fileName.split(".");
    let newFileName =
      splittedFilename[0] +
      uuid() +
      "." +
      splittedFilename[splittedFilename.length - 1];

    avatar.mv(
      path.join(__dirname, "..", "uploads", newFileName),
      async (err) => {
        if (err) {
          return next(new HttpError(err.message, 500));
        }
        const updatedAvatar = await User.findByIdAndUpdate(
          req.user.id,
          { avatar: newFileName },
          { new: true }
        );
        if (!updatedAvatar) {
          return next(new HttpError("Failed to update user avatar.", 422));
        }

        // Respond with success message
        res.status(200).json(updatedAvatar);
      }
    );
  } catch (error) {
    return next(new HttpError(error.message, 500));
  }
};

// ================Edit User Details(from profile)=====================
// POST : api/users/edit-user
// PROTECTED
const editUser = async (req, res, next) => {
  try {
    const { name, email, currentPassword, newPassword, confirmNewPassword } =
      req.body;

    if (!name || !email || !currentPassword || !newPassword) {
      return next(new HttpError("Fill in all fields.", 422));
    }

    // get user from database
    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new HttpError("User not found", 403));
    }
    // Make sure new email doesn't already exist
    const emailExist = await User.findOne({ email });

    if (emailExist && emailExist._id !== req.user.id) {
      return next(new HttpError("Email already exists.", 422));
    }

    // Compare current password to db password
    const validateUserPassword = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!validateUserPassword) {
      return next(new HttpError("Invalid current password.", 422));
    }

    //COMPARE NEW PASSWORDS
    if (newPassword !== confirmNewPassword) {
      return next(new HttpError("New passwords do not match.", 422));
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    // Update user info in database
    const newInfo = await User.findByIdAndUpdate(
      req.user.id,
      { name, email, password: hash },
      { new: true }
    );

    res.status(200).json(newInfo);
  } catch (error) {
    return next(new HttpError(error.message, 500));
  }
};

// =====================================GET AUTHORS
// POST : api/users/authors
// UnPROTECTED
const getAuthors = async (req, res, next) => {
  try {
    const authors = await User.find().select("-password");
    res.json(authors);
  } catch (error) {
    return next(new HttpError(error));
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUser,
  changeAvatar,
  editUser,
  getAuthors,
};
