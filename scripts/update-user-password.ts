/*
This is only really used to update the password for the test user.
We need it for app review.
*/

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '..', '.env') })

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const testUserId = process.env.TEST_USER_ID
const testUserPassword = process.env.TEST_USER_PASSWORD

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Get user ID and new password from command line arguments
const userId = testUserId || ''
const newPassword = testUserPassword

if (!userId || !newPassword) {
  console.error('Usage: tsx scripts/update-user-password.ts <user-id> <new-password>')
  process.exit(1)
}

// Update a user's password
async function updatePassword() {
  try {
    const { data, error } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (error) {
      console.error('Error updating password:', error.message)
      process.exit(1)
    }

    console.log('Password updated successfully!')
    console.log('User:', data.user?.email || data.user?.id)
  } catch (err) {
    console.error('Unexpected error:', err)
    process.exit(1)
  }
}

updatePassword()

