// components/Announcement.tsx
'use client'

export default function Announcement() {
  return (
    <div className='p-10 max-w-md mx-auto bg-indigo-800 rounded-2xl shadow'>
      <h1 className='text-2xl mb-6 font-bold text-center text-blue-500'>
        Друзья, подключайтесь к первому дню Летней Конференции!
      </h1>
      <h2 className='text-2xl mb-6 font-bold text-center text-blue-500'>
        Свобода-2025!
      </h2>
      <div className='text-lg text-white text-center mb-3'></div>
      <ul className='space-y-2 text-green-300 text-center'>
        <li>
          <b>Ютуб:</b>{' '}
          <a
            href='https://youtu.be/Od_tf6X8jq0'
            target='_blank'
            rel='noopener noreferrer'
            className='underline hover:text-blue-300'
          >
            https://youtu.be/Od_tf6X8jq0
          </a>
        </li>
        <li>
          <b>Рутуб:</b>{' '}
          <a
            href='https://rutube.ru/video/your_link_here'
            target='_blank'
            rel='noopener noreferrer'
            className='underline hover:text-blue-300'
          >
            https://rutube.ru/video/your_link_here
          </a>
        </li>
      </ul>
      <h2 className='text-2xl mb-6 font-bold text-center text-blue-500 pt-10'>
        ⚜️💖💛💙⚜️
      </h2>
    </div>
  )
}
