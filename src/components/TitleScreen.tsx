type Props = {
  hasSave: boolean
  onNew: () => void
  onContinue: () => void
  onErase: () => void
}

export function TitleScreen({ hasSave, onNew, onContinue, onErase }: Props) {
  return (
    <div className="screen title-screen">
      <div className="title-hero">
        <img src={`${import.meta.env.BASE_URL}covers/world.png`} alt="The Amber Shroud — three factions, one desert" />
        <div className="title-veil" />
        <div className="title-copy">
          <p className="kicker">A desert of Drops, Glints, and bad religion</p>
          <h1>
            The Amber
            <br />
            Shroud
          </h1>
          <p className="tag">Three factions. One desert. No mercy.</p>
        </div>
      </div>
      <div className="title-actions">
        <p className="flagship">
          Flagship path: <em>The Hunger in the Amber</em>
        </p>
        <button type="button" className="btn btn-gold" onClick={onNew}>
          New game
        </button>
        <button type="button" className="btn btn-ghost" onClick={onContinue} disabled={!hasSave}>
          Continue
        </button>
        {hasSave ? (
          <button type="button" className="text-link" onClick={onErase}>
            Erase save
          </button>
        ) : null}
        <p className="credit">A story of the Amber Shroud · bigjerm21</p>
      </div>
    </div>
  )
}
