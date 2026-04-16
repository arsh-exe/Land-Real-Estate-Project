# Database Schema

## Users

- `fullName: String`
- `email: String (unique)`
- `password: String (hashed)`
- `role: Enum(Admin|Buyer|Seller|Government Officer)`
- `isActive: Boolean`

## Properties

- `propertyId: String (unique)`
- `title, location, type`
- `price, area`
- `owner: ObjectId(User)`
- `documents: ObjectId[] (Document)`
- `ownershipHistory[]`
  - `owner: ObjectId(User)`
  - `transferredAt: Date`
  - `note: String`

## Registrations

- `registrationId: String (unique)`
- `property: ObjectId(Property)`
- `buyer: ObjectId(User)`
- `seller: ObjectId(User)`
- `sellerDecision { status, note, date }`
- `officerDecision { officer, status, note, date }`
- `finalStatus: Enum(Pending|Approved|Rejected)`

## Transactions

- `transactionId: String (unique)`
- `registration: ObjectId(Registration)`
- `property: ObjectId(Property)`
- `fromOwner, toOwner: ObjectId(User)`
- `amount: Number`
- `status: Enum(Pending|Approved|Rejected)`
- `note: String`

## Documents

- `documentId: String (unique)`
- `originalName, filePath, mimeType, size`
- `uploadedBy: ObjectId(User)`
- `property: ObjectId(Property)`
- `registration: ObjectId(Registration)`
- `kind: Enum(PROPERTY_DOC|CERTIFICATE)`
