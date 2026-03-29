import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import type { User as PrismaUser } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import UsersTable from './UsersTable'

type UserDTO = Omit<PrismaUser, 'paymentDate'> & {
  paymentDate: string | null
}

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || !['ADMIN', 'SUPER'].includes(session.user.role)) {
    redirect('/')
  }

  const users: UserDTO[] = (
    await prisma.user.findMany({ orderBy: [{ lastName: 'asc' }] })
  ).map(
    (u: PrismaUser): UserDTO => ({
      ...u,
      paymentDate: u.paymentDate ? u.paymentDate.toISOString() : null,
    })
  )

  return (
    <div className='max-w-7xl mx-auto'>
      <h1 className='text-2xl font-bold mb-6 text-white'>Пользователи</h1>
      <UsersTable users={users} currentRole={session.user.role} />
    </div>
  )
}
