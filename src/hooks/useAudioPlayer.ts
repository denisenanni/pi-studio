import { useCallback, useEffect, useRef, useState } from 'react'
import { Player, gainToDb, start as toneStart, getContext } from 'tone'

export interface AudioPlayerControls {
  play: () => Promise<void>
  // Async because it must resume the AudioContext inside the user gesture
  // before the caller changes selectedSample.
  playOnLoad: () => Promise<void>
  stop: () => void
  isPlaying: boolean
  error: string | null
}

export function useAudioPlayer(
  sampleName: string,
  rate: number,
  amp: number,
): AudioPlayerControls {
  const playerRef = useRef<Player | null>(null)
  const pendingPlayRef = useRef(false)
  // Tracks whether the user has ever triggered a play — guards Player creation
  // in useEffect so the Tone.js AudioContext is never initialised on mount.
  const audioContextStartedRef = useRef(false)

  // Always-current refs so callbacks never close over stale values.
  const rateRef = useRef(rate)
  const ampRef = useRef(amp)
  rateRef.current = rate
  ampRef.current = amp

  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Preload the next buffer only after the AudioContext has been started by
  // a user gesture.  On cold start audioContextStartedRef is false, so no
  // Player (and therefore no AudioContext) is created until the user interacts.
  useEffect(() => {
    if (!sampleName || !audioContextStartedRef.current) return

    const url = `${import.meta.env.BASE_URL}samples/${sampleName}.flac`

    const player = new Player({
      url,
      onload: () => {
        setError(null)
        if (pendingPlayRef.current) {
          pendingPlayRef.current = false
          player.playbackRate = rateRef.current
          player.volume.value =
            ampRef.current === 0 ? -Infinity : gainToDb(ampRef.current)
          // No toneStart() here — AudioContext was already resumed by the
          // user-gesture handler (play / playOnLoad) that set pendingPlayRef.
          player.start()
          setIsPlaying(true)
        }
      },
      onerror: () => {
        pendingPlayRef.current = false
        setError('File not found — add FLAC to public/samples/')
        setIsPlaying(false)
      },
    }).toDestination()

    player.onstop = () => setIsPlaying(false)
    playerRef.current = player

    return () => {
      player.dispose()
      playerRef.current = null
      setIsPlaying(false)
      setError(null)
    }
  }, [sampleName])

  const play = useCallback(async (): Promise<void> => {
    // toneStart() is called exclusively here — inside a user-gesture handler.
    // getContext().state check avoids redundant resume calls when already running.
    if (getContext().state !== 'running') {
      await toneStart()
    }
    audioContextStartedRef.current = true

    const player = playerRef.current

    if (!player) {
      // Cold start: AudioContext just became safe to use, so create the Player
      // lazily here rather than at component mount.
      const url = `${import.meta.env.BASE_URL}samples/${sampleName}.flac`
      pendingPlayRef.current = true

      const newPlayer = new Player({
        url,
        onload: () => {
          setError(null)
          if (pendingPlayRef.current) {
            pendingPlayRef.current = false
            newPlayer.playbackRate = rateRef.current
            newPlayer.volume.value =
              ampRef.current === 0 ? -Infinity : gainToDb(ampRef.current)
            newPlayer.start()
            setIsPlaying(true)
          }
        },
        onerror: () => {
          pendingPlayRef.current = false
          setError('File not found — add FLAC to public/samples/')
          setIsPlaying(false)
        },
      }).toDestination()

      newPlayer.onstop = () => setIsPlaying(false)
      playerRef.current = newPlayer
      return
    }

    if (!player.loaded) {
      pendingPlayRef.current = true
      return
    }

    if (player.state === 'started') player.stop()
    player.playbackRate = rateRef.current
    player.volume.value =
      ampRef.current === 0 ? -Infinity : gainToDb(ampRef.current)
    player.start()
    setIsPlaying(true)
  }, [sampleName])

  // Call this inside a user-gesture handler immediately before changing
  // selectedSample.  It resumes the AudioContext and queues autoplay so the
  // next buffer plays as soon as it finishes loading.
  const playOnLoad = useCallback(async (): Promise<void> => {
    if (getContext().state !== 'running') {
      await toneStart()
    }
    audioContextStartedRef.current = true
    pendingPlayRef.current = true
  }, [])

  const stop = useCallback((): void => {
    pendingPlayRef.current = false
    playerRef.current?.stop()
    setIsPlaying(false)
  }, [])

  return { play, playOnLoad, stop, isPlaying, error }
}
