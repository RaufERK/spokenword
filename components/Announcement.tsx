export default function Announcement() {
  return (
    <div
      className='
        p-10 max-w-xl mx-auto
        bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-800
        rounded-2xl shadow-2xl border-4 border-yellow-400
        flex flex-col items-center
        transition-all
      '
      style={{ boxShadow: '0 8px 32px rgba(30,40,90,0.2)' }}
    >
      <div className='mb-4 flex flex-col items-center'>
        <span className='inline-block px-4 py-1 mb-2 bg-yellow-400 rounded-full text-indigo-900 text-xl font-bold shadow-lg animate-pulse'>
          ⚜️ Свобода-2025! ⚜️
        </span>
        <h1 className='text-3xl font-bold text-yellow-300 text-center drop-shadow mb-2 tracking-wider'>
          Друзья, подключайтесь
          <br />к первому дню Летней Конференции!
        </h1>
      </div>
      <ul className='space-y-2 text-center mb-8'>
        <li>
          <b className='text-cyan-300'>Ютуб:</b>{' '}
          <a
            href='https://youtu.be/5pDV90CH3YA'
            target='_blank'
            rel='noopener noreferrer'
            className='underline hover:text-yellow-200 font-semibold transition'
          >
            https://youtu.be/Od_tf6X8jq0
          </a>
        </li>
        <li>
          <b className='text-cyan-300'>Рутуб:</b>{' '}
          <a
            href='https://rutube.ru/video/6dacdfda0a77d38991153982aee1eda2/?r=wd'
            target='_blank'
            rel='noopener noreferrer'
            className='underline hover:text-yellow-200 font-semibold transition'
          >
            ссылка на RUTUBE
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
