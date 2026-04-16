# API Specification

Base URL: `http://localhost:5000/api`

## Auth

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/logout` (protected)
- `GET /auth/me` (protected)
- `GET /auth/users` (Admin/Officer)

## Properties

- `GET /properties` - supports query filters
  - `location`, `type`, `minPrice`, `maxPrice`, `sortBy`, `order`
- `GET /properties/:id`
- `GET /properties/my` (Seller/Admin)
- `POST /properties` (Seller/Admin, multipart with `documents[]`)
- `PUT /properties/:id` (Seller/Admin/Officer)
- `DELETE /properties/:id` (Seller/Admin)

## Registrations

- `GET /registrations` (role-scoped)
- `POST /registrations` (Buyer)
- `PATCH /registrations/:id/seller-decision` (Seller)
- `PATCH /registrations/:id/officer-decision` (Admin/Officer)

## Dashboard

- `GET /dashboard` (all authenticated roles)

## Transactions

- `GET /transactions` (role-scoped)

## Certificates

- `POST /certificates/:registrationId` (Admin/Officer)

Returns certificate metadata and a QR verification URL.
