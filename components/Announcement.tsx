export default function Announcement() {
  return (
    <div
      className='
        p-6 max-w-xl mx-auto
        bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-800
        rounded-2xl shadow-2xl border-4 border-blue-400
        flex flex-col items-center
        transition-all
      '
      style={{ boxShadow: '0 8px 32px rgba(30,40,90,0.2)' }}
    >
      <div className='mb-4 flex flex-col items-center'>
        <span className='inline-block px-4 py-1 mb-2 bg-purple-400 rounded-full text-indigo-900  font-bold shadow-lg animate-pulse'>
          ⚜️ Свобода-2025! ⚜️
        </span>
        <h2 className='text-2xl font-bold text-yellow-300 text-center drop-shadow mb-2 tracking-wider'>
          Друзья, подключайтесь к Летней Конференции!
        </h2>
      </div>
      <ul className='space-y-2 text-center mb-8'>
        <li>
          {/* <b className='text-cyan-300'>Ютуб:</b>{' '} */}
          <a
            href='https://www.youtube.com/@Spokenword_ru'
            target='_blank'
            rel='noopener noreferrer'
            className='underline hover:text-yellow-200 font-semibold transition'
          >
            YOUTUBE
          </a>
        </li>
        <li>
          {/* <b className='text-cyan-300'>Рутуб:</b>{' '} */}
          <a
            href='https://rutube.ru/channel/41772427/'
            target='_blank'
            rel='noopener noreferrer'
            className='underline hover:text-yellow-200 font-semibold transition'
          >
            RUTUBE
          </a>
        </li>
      </ul>
      <div className='flex gap-3 justify-center text-2xl mt-2'>
        <span className='animate-bounce text-yellow-200'>⚜️</span>
        <span className='text-pink-400 animate-pulse'>💖</span>
        <span className='text-yellow-300 animate-bounce'>💛</span>
        <span className='text-blue-300 animate-pulse'>💙</span>
        <span className='animate-bounce text-yellow-200'>⚜️</span>
      </div>
    </div>
  )
}
