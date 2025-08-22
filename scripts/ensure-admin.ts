// src/scripts/ensure-admin.ts
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs' // évite les soucis natifs, pur JS

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL
  const uid = process.env.ADMIN_UID as string // uid Firebase si tu l’utilises
  const name = process.env.ADMIN_NAME || 'Admin'
  const rawPassword = process.env.ADMIN_PASSWORD // optionnel
  const roleAdmin = Role.OWNER // adapte selon ton enum/const

  if (!email) {
    console.log('ADMIN_EMAIL not set, nothing to do.')
    return
  }

  let passwordHash: string | undefined
  if (rawPassword && rawPassword.length >= 8) {
    passwordHash = await bcrypt.hash(rawPassword, 10)
  }

  // Adapte les champs au modèle de ta table User
  await prisma.user.upsert({
    where: { email }, // ou { uid } si unique
    create: {
      email,
      firebaseUid: uid,
      firstName: name,
      lastName: name,
      role: roleAdmin,
    },
    update: {
      firebaseUid: uid,
      role: roleAdmin,
    },
  })

  console.log('✔ Admin ensured.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
