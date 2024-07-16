import mongoose from 'mongoose'

// Connect to Database
await mongoose.connect(process.env.DB_CONNECT)

export const ticketSchema = new mongoose.Schema({
  info: String,
  phone: String,
  status: String,
})

export const _tickets_ = mongoose.model('tickets', ticketSchema)

export const tickets = {}
