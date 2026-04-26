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

  const raw = await prisma.user.findMany({
    orderBy: [{ lastName: 'asc' }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      login: true,
      password: true,
      phoneNumber: true,
      city: true,
      accessUntil: true,
      role: true,
      eventAccess: {
        orderBy: { paymentDate: 'desc' },
        take: 1,
        select: {
          paymentDate: true,
          status: true,
          event: { select: { title: true } },
        },
      },
    },
  })

  const users: UserRow[] = raw.map((u) => {
    const lastAccess = u.eventAccess[0] ?? null
    return {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      login: u.login,
      password: u.password,
      phoneNumber: u.phoneNumber,
      city: u.city,
      accessUntil: u.accessUntil ? u.accessUntil.toISOString() : null,
      role: u.role,
      lastEvent: lastAccess
        ? { title: lastAccess.event.title, paymentDate: lastAccess.paymentDate.toISOString() }
        : null,
    }
  })

  return <UsersTable users={users} currentRole={session.user.role} currentUserId={Number(session.user.id)} />
}
