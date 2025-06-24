// app/users/page.tsx

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import UsersTable from '@/components/UsersTable'
import type { User as PrismaUser } from '@prisma/client'

/** ① Убираем поле paymentDate и кладём своё строковое  */
type UserDTO = Omit<PrismaUser, 'paymentDate'> & {
  paymentDate: string | null
}

export default async function UsersPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || !['ADMIN', 'SUPER'].includes(session.user.role)) {
    redirect('/login')
  }

  /** ② явно типизируем параметр `u` */
  const users: UserDTO[] = (
    await prisma.user.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })
  ).map(
    (u: PrismaUser): UserDTO => ({
      ...u,
      paymentDate: u.paymentDate ? u.paymentDate.toISOString() : null,
    })
  )

  return (
    <main className='p-6'>
      <h1 className='text-2xl font-bold mb-6'>Пользователи</h1>
      <UsersTable users={users} />
    </main>
  )
}
