import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const exists = await prisma.user.findFirst({ where: { role: 'SUPER' } })
  if (exists) {
    console.log('Super-admin already exists')
    return
  }

  const result = await prisma.user.create({
    data: {
      firstName: 'Rauf',
      lastName: 'Erk',
      login: 'RaufE',
      password: '222777',
      role: 'SUPER',
      phoneNumber: '+79629483300',
    },
  })
  console.log(result)
  console.log('Super-admin created ✔')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
