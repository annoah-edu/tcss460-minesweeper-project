const PHASE_III = 'Coming in Phase III with user accounts';

export default function NavBar() {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <a className="brand" href="#top">
          <img src="/mine.svg" alt="" width="26" height="26" />
          MineMentor
        </a>

        <nav className="nav-links" aria-label="Main">
          <a href="#top" aria-current="page">Play</a>
          <span className="nav-disabled" title={PHASE_III}>My Stats</span>
          <a href="#leaderboard">Leaderboard</a>
        </nav>

        <div className="nav-auth">
          <button type="button" className="ghost" disabled title={PHASE_III}>Log in</button>
          <button type="button" className="primary" disabled title={PHASE_III}>Sign up</button>
        </div>
      </div>
    </header>
  );
}
