# Smart Tax BD API Documentation

**Base URL:** `http://localhost:5000/api/v1`

## Authentication

### Login
- **URL:** `/auth/login`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "id": "user_id/mobile",
    "password": "your_password"
  }
  ```

### Change Password
- **URL:** `/auth/change-password`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "oldPassword": "...",
    "newPassword": "..."
  }
  ```

### Refresh Token
- **URL:** `/auth/refresh-token`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "refreshToken": "..."
  }
  ```

### Forget Password
- **URL:** `/auth/forget-password`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "id": "user_id/mobile"
  }
  ```

### Reset Password
- **URL:** `/auth/reset-password`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "id": "user_id/mobile",
    "newPassword": "...",
    "token": "..."
  }
  ```

### Logout
- **URL:** `/auth/logout`
- **Method:** `POST`
- **Auth required:** `YES` (Any Role)

---

## Users

### Register
- **URL:** `/users/register`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "name": "...",
    "mobile": "...",
    "email": "...",
    "password": "..."
  }
  ```

### Get Users
- **URL:** `/users/get-users`
- **Method:** `GET`
- **Auth required:** `Admin/SuperAdmin`

### Get User by Mobile
- **URL:** `/users/get-user/:mobile`
- **Method:** `GET`

### Update User
- **URL:** `/users/update/:mobile`
- **Method:** `PATCH`
- **Auth required:** `Admin/SuperAdmin`

### Get Current User (Me)
- **URL:** `/users/get-me`
- **Method:** `GET`
- **Auth required:** `YES`

---

## Tax Orders

### Create Tax Order
- **URL:** `/tax-orders/order-tax`
- **Method:** `POST`
- **Auth required:** `YES`

### Get All Tax Orders
- **URL:** `/tax-orders/get-tax`
- **Method:** `GET`
- **Auth required:** `YES`

### Get Single Tax Order
- **URL:** `/tax-orders/get-tax/:id`
- **Method:** `GET`
- **Auth required:** `YES`

### Get User Orders
- **URL:** `/tax-orders/get-user-order`
- **Method:** `GET`
- **Auth required:** `User`

---

## Tax Types

### Create Tax Type
- **URL:** `/tax-types/create-tax-type`
- **Method:** `POST`
- **Auth required:** `Admin/SuperAdmin`

### Get All Tax Types
- **URL:** `/tax-types/get-all-tax-types`
- **Method:** `GET`
- **Auth required:** `YES`

### Update Tax Type
- **URL:** `/tax-types/update-tax-type/:id`
- **Method:** `PATCH`
- **Auth required:** `Admin/SuperAdmin`

### Delete Tax Type
- **URL:** `/tax-types/delete-tax-type/:id`
- **Method:** `DELETE`
- **Auth required:** `Admin/SuperAdmin`

---

## Files

### Upload File
- **URL:** `/files/create-file`
- **Method:** `POST`
- **Auth required:** `YES`
- **Content-Type:** `multipart/form-data`
- **Fields:** `file` (File), `data` (JSON String)

### Delete File
- **URL:** `/files/delete-file/:id`
- **Method:** `DELETE`
- **Auth required:** `YES`

### Get All Files
- **URL:** `/files/get-all-files`
- **Method:** `GET`
- **Auth required:** `YES`

### Get Single File
- **URL:** `/files/get-single-file/:id`
- **Method:** `GET`
- **Auth required:** `YES`

### Get User Files
- **URL:** `/files/get-user-files`
- **Method:** `GET`
- **Auth required:** `YES`
