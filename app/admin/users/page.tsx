import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import UsersTable, { UserRow } from './UsersTable'

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || !['MODERATOR', 'ADMIN', 'SUPER'].includes(session.user.role)) {
    redirect('/')
  }

  const users: UserRow[] = (
    await prisma.user.findMany({
      orderBy: [{ lastName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        login: true,
        password: true,
        phoneNumber: true,
        city: true,
        paymentDate: true,
        accessUntil: true,
        role: true,
      },
    })
  ).map((u) => ({
    ...u,
    paymentDate: u.paymentDate ? u.paymentDate.toISOString() : null,
    accessUntil: u.accessUntil ? u.accessUntil.toISOString() : null,
  }))

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Пользователи</h1>
          <p className="text-pink-300/60 text-sm mt-1">Всего: {users.length}</p>
        </div>
      </div>
      <UsersTable users={users} currentRole={session.user.role} />
    </div>
  )
}
