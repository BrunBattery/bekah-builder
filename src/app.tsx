import { useState, useEffect, useRef } from 'react';
import { Timer, Dumbbell, Calendar, Download, ArrowLeft, Check, Plus, Minus, ChevronDown, ChevronRight, List, ChevronLeft, Trash2, Upload, Save, RotateCcw, Info, Trophy, Gift, Flame, Moon, PenTool } from 'lucide-react';

// --- Types ---

interface ExerciseDef {
  name: string;
  sets: number;
  repRange: string;
  note?: string;
  bodyweight?: boolean | null;
  options?: Array<string | { name: string; repRange?: string; bodyweight?: boolean | null }>;
  superset?: string; // Name of the exercise paired with
  isSuperset?: boolean; // True if this is the SECOND part of a superset
  stopwatch?: boolean; // true for exercises measured by duration (e.g., Dead Hangs)
}

interface WorkoutDef {
  name: string;
  focus: string; // Added for the menu description
  exercises: ExerciseDef[];
}

interface SetLog {
  exercise: string;
  set: number;
  weight: number;
  reps: number;
  timestamp: string;
  notes?: string;
  durationSeconds?: number;
}

interface WorkoutSession {
  workout: string;
  date: string;
  exercises: SetLog[];
  preWorkoutCardio?: string;
  customPlan?: string;
}


type ScreenState = 'home' | 'workout' | 'history' | 'export' | 'import' | 'trophy' | 'shop' | 'dev';

// --- Constants ---

const WORKOUTS: Record<string, WorkoutDef> = {
  A: {
    name: 'Full Body A',
    focus: 'Knee Flexion / Squat',
    exercises: [
      { name: 'Squats', sets: 5, repRange: '6-10', note: 'Machine/smith/barbell all fine', bodyweight: false },
      {
        name: 'Push-ups/DB Bench',
        sets: 3,
        repRange: '8-12',
        options: ['Push-ups', 'DB Bench'],
        superset: 'EZ Bar Curls/Dumbbell Curls',
        bodyweight: null
      },
      { name: 'EZ Bar Curls/Dumbbell Curls', sets: 3, repRange: '8-12', options: [{ name: 'EZ Bar Curls', repRange: '8-12' }, { name: 'Dumbbell Curls', repRange: '8-12' }], isSuperset: true, bodyweight: false },
      { name: 'Bulgarian Split Squats', sets: 3, repRange: '8-12', note: 'Each leg', superset: 'Abs', bodyweight: false },
      { name: 'Abs', sets: 3, repRange: 'AMRAP', isSuperset: true, bodyweight: true },
      { name: 'Machine Kickbacks', sets: 3, repRange: '12-20', superset: 'Seated Cable Row/Machine Row', bodyweight: false },
      { name: 'Seated Cable Row/Machine Row', sets: 3, repRange: '10-15', options: [{ name: 'Seated Cable Row', repRange: '10-15' }, { name: 'Machine Row', repRange: '8-12' }], isSuperset: true, bodyweight: false }
    ]
  },
  B: {
    name: 'Full Body B',
    focus: 'Hip Hinge / Deadlift',
    exercises: [
      { name: 'RDLs', sets: 5, repRange: '8-12', bodyweight: false },
      {
        name: 'Lat Pulldowns/Assisted Pullups',
        sets: 3,
        repRange: '10-15',
        options: ['Lat Pulldowns', 'Assisted Pullups'],
        superset: 'Lateral Raises',
        bodyweight: null
      },
      { name: 'Lateral Raises', sets: 3, repRange: '12-15', isSuperset: true, bodyweight: false },
      { name: 'Hip Thrusts', sets: 3, repRange: '12-15', superset: 'Triceps Pushdowns', bodyweight: false },
      { name: 'Triceps Pushdowns', sets: 3, repRange: '10-15', isSuperset: true, bodyweight: false },
      { name: 'Calf Raises', sets: 3, repRange: '10-15', superset: 'Dead Hangs', bodyweight: false },
      { name: 'Dead Hangs', sets: 3, repRange: 'failure', isSuperset: true, stopwatch: true, bodyweight: true }
    ]
  },
  C: {
    name: 'Full Body C',
    focus: 'Knee Flexion / Press',
    exercises: [
      { name: 'Leg Press', sets: 5, repRange: '8-12', bodyweight: false },
      { name: 'DB OHP', sets: 3, repRange: '6-10', superset: 'Machine Row/Seated Cable Row', bodyweight: false },
      { name: 'Machine Row/Seated Cable Row', sets: 3, repRange: '8-15', options: [{ name: 'Seated Cable Row', repRange: '10-15' }, { name: 'Machine Row', repRange: '8-12' }], isSuperset: true, bodyweight: false },
      {
        name: 'DB Bench/Push-ups',
        sets: 3,
        repRange: '8-12',
        options: ['DB Bench', 'Push-ups'],
        superset: 'Back Extensions',
        bodyweight: null
      },
      { name: 'Back Extensions', sets: 3, repRange: '12-15', note: 'Glute-focused', isSuperset: true, bodyweight: false },
      { name: 'Leg Curls', sets: 3, repRange: '10-15', superset: 'Machine Kickbacks', bodyweight: false },
      { name: 'Machine Kickbacks', sets: 3, repRange: '12-20', isSuperset: true, bodyweight: false }
    ]
  }
};

const ENCOURAGEMENTS = [
  "Imagine the weight just insulted Joj 🐱😡",
  "Shirtless Steve is rooting for you 💪",
  "Make sure to wiggle before this set 💃",
  "LIGHT WEIGHT BABY! 🏋️‍♀️",
  "Do it for the snacks waiting at home 🥨",
  "Get a PB for PB! 🥜",
  "This exercise is better than goblin squats 👺",
  "Rep til you can carry ALL the grocery bags 🛒",
  "Feral mode, ACTIVATE! 🐅",
  "WINNING EVERYDAY! 🏆 I AVOID MISTAKES",
  "WINNING EVERYDAY! 🏆 DON'T LIKE SECOND PLACE!",
  "CARPE DIEM! (how 'bout we seize the day?) 🌞",
  "Hopped outta bed, what I'm gonna eat?! 🍳",
  "Accomplishing my tasks, I rinse it and repeat! 🔁"
];

const WORKOUT_ORDER = ['A', 'B', 'C'];

interface Reward {
  id: string;
  name: string;
  cost: number;
  description: string;
}

const REWARDS: Reward[] = [
  { id: 'kiss', name: 'A Kiss', cost: 3, description: "A kiss from Steve 💋" },
  { id: 'snuggle', name: 'Snuggle Session', cost: 9, description: 'A soothing snuggle session, big sighs included 🤗' },
  { id: 'massage', name: 'Massage', cost: 12, description: "A relaxing massage from Steve's callused hands 💪" },
  { id: 'can-i-sing', name: 'Can I Sing For You?', cost: 15, description: 'Your choice of song for a beautiful serenade from Steve 🎵' },
  { id: 'driving', name: 'Driving Lessons', cost: 60, description: 'Try your best to keep your eyes open 👀' },
  { id: 'date', name: 'Date Night', cost: 45, description: 'A special date of your choice 🌹' },
  { id: 'mystery', name: 'Mystery Prize', cost: 90, description: 'A mysterious prize - it could be anything ❓' }
];

// --- Styles ---

const styles = `
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type=number] {
    -moz-appearance: textfield;
  }
  
  @keyframes confetti-fall {
    0% { transform: translateY(-100%) rotate(0deg); }
    100% { transform: translateY(100vh) rotate(360deg); }
  }
  
  .confetti {
    position: fixed;
    width: 10px;
    height: 10px;
    top: -10%;
    z-index: 50;
    animation: confetti-fall linear forwards;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1; 
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #fbcfe8; 
    border-radius: 4px;
  }
`;

// --- Main Component ---

export default function BekahBuilder() {
  // App State
  const [screen, setScreen] = useState<ScreenState>('home');
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null);
  const [exerciseChoices, setExerciseChoices] = useState<Record<string, string>>({});
  const [setupScreen, setSetupScreen] = useState(false);
  const [preWorkoutCardio, setPreWorkoutCardio] = useState<string>('none');

  // Workout State
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [currentSetIdx, setCurrentSetIdx] = useState(0);
  const [sessionData, setSessionData] = useState<SetLog[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutSession[]>([]);

  // Pending Navigation State
  const [pendingNav, setPendingNav] = useState<{ exIdx: number, setIdx: number } | null>(null);

  // Timer State
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [showRestChoice, setShowRestChoice] = useState(false);
  const [suggestedRestTime, setSuggestedRestTime] = useState(120);
  const timerEndRef = useRef<number | null>(null);
  // Dead hang / stopwatch state for exercises that record duration instead of reps/weight (milliseconds)
  const [deadHangActive, setDeadHangActive] = useState(false);
  const [deadHangPaused, setDeadHangPaused] = useState(false);
  const [deadHangMs, setDeadHangMs] = useState(0);
  const deadHangIntervalRef = useRef<number | null>(null);
  const deadHangStartRef = useRef<number | null>(null);
  const deadHangAccumRef = useRef<number>(0);

  // UI State
  const [encouragement, setEncouragement] = useState('');
  const [lastEncouragementIdx, setLastEncouragementIdx] = useState<number>(-1);

  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});
  const [showNotesEditor, setShowNotesEditor] = useState(false);
  const [currentNoteExercise, setCurrentNoteExercise] = useState<string | null>(null);
  const [showEditHistoryNote, setShowEditHistoryNote] = useState(false);
  const [editHistoryExercise, setEditHistoryExercise] = useState<string | null>(null);
  const [editHistoryNoteText, setEditHistoryNoteText] = useState('');
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customText, setCustomText] = useState('');
  const [showProgressView, setShowProgressView] = useState(false);
  const [expandedExercises, setExpandedExercises] = useState<Record<string, boolean>>({});
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [importText, setImportText] = useState('');
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [showSwapExercise, setShowSwapExercise] = useState(false);
  const [pendingSwaps, setPendingSwaps] = useState<Record<string, string>>({});
  const [disabledSupersets, setDisabledSupersets] = useState<Set<string>>(new Set());
  const [pendingSupersetChanges, setPendingSupersetChanges] = useState<Set<string>>(new Set());

  // Confetti State
  const [confetti, setConfetti] = useState<{ id: number, color: string, left: string, animationDuration: string, delay: string }[]>([]);

  // Centralized confetti helper
  const spawnConfetti = (type: 'workout' | 'rest' | 'custom' | 'shop' | 'hotYoga') => {
    let colors: string[] = [];
    let count = 60;
    switch (type) {
      case 'rest':
        colors = ['#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'];
        break;
      case 'custom':
        colors = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0'];
        break;
      case 'shop':
        colors = ['#ffd700', '#ffed4e', '#ffc700', '#f4c430', '#ffe135'];
        count = 80;
        break;
      case 'hotYoga':
        colors = ['#ff6b35', '#ff8c42', '#ffa630', '#ff6b35', '#ff8c42'];
        break;
      default:
        // generic workout complete (pink celebration)
        colors = ['#ec4899', '#f472b6', '#fb7185', '#fbcfe8', '#ffd700'];
    }

    const newConfetti = Array.from({ length: count }).map((_, i) => ({
      id: i,
      color: colors[Math.floor(Math.random() * colors.length)],
      left: `${Math.random() * 100}%`,
      animationDuration: `${Math.random() * 3 + 2}s`,
      delay: `${Math.random() * 0.5}s`
    }));
    setConfetti(newConfetti);
  };

  // Star System State
  const [stars, setStars] = useState<{ gold: number, silver: number }>({ gold: 0, silver: 0 });
  const [purchasedReward, setPurchasedReward] = useState<Reward | null>(null);
  const [showRewardPurchaseScreen, setShowRewardPurchaseScreen] = useState(false);

  // Dev Menu State
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [devAddGold, setDevAddGold] = useState('');
  const [devAddSilver, setDevAddSilver] = useState('');

  // Hot Yoga Dialog State
  const [showHotYogaDialog, setShowHotYogaDialog] = useState(false);
  const [showRestDayDialog, setShowRestDayDialog] = useState(false);
  const [showRestDayComplete, setShowRestDayComplete] = useState(false);
  const [showHotYogaComplete, setShowHotYogaComplete] = useState(false);
  const [showCustomComplete, setShowCustomComplete] = useState(false);
  const [showBackupReminder, setShowBackupReminder] = useState(false);
  const [showUpdateAvailable, setShowUpdateAvailable] = useState(false);

  // --- Effects ---

  useEffect(() => {
    const saved = localStorage.getItem('bekah-builder-data');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setWorkoutHistory(data.history || []);
        setStars(data.stars || { gold: 0, silver: 0 });
        // load independent exercise notes
        if (data.exerciseNotes) {
          setExerciseNotes(data.exerciseNotes);
        }
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    const activeSession = localStorage.getItem('bekah-builder-active-session');
    if (activeSession) {
      setHasActiveSession(true);
    }
  }, []);

  useEffect(() => {
    if (workoutHistory.length > 0 || (stars.gold > 0 || stars.silver > 0)) {
      localStorage.setItem('bekah-builder-data', JSON.stringify({
        history: workoutHistory,
        stars,
        exerciseNotes
      }));
    }
  }, [workoutHistory, stars, exerciseNotes]);

  useEffect(() => {
    if (screen === 'workout' && selectedWorkout) {
      const activeState = {
        selectedWorkout,
        exerciseChoices,
        currentExerciseIdx,
        currentSetIdx,
        sessionData,
        weight,
        reps,
        timestamp: new Date().getTime()
      };
      localStorage.setItem('bekah-builder-active-session', JSON.stringify(activeState));
    }
  }, [screen, selectedWorkout, exerciseChoices, currentExerciseIdx, currentSetIdx, sessionData, weight, reps]);

  useEffect(() => {
    // Use a Date-based timer so it works correctly when tab is inactive (avoids interval throttling)
    let interval: any;
    if (timerActive) {
      interval = setInterval(() => {
        if (timerEndRef.current) {
          const remaining = Math.max(0, Math.round((timerEndRef.current - Date.now()) / 1000));
          setTimerSeconds(remaining);
          if (remaining <= 0) {
            playTimerSound();
            setTimerActive(false);
            setShowRestChoice(false);
            timerEndRef.current = null;
            try { performNavigation(); } catch (e) { console.error('performNavigation failed on timer end', e); }
          }
        } else {
          // fallback: decrement every tick
          setTimerSeconds(s => {
            if (s <= 1) {
              playTimerSound();
              setTimerActive(false);
              setShowRestChoice(false);
              try { performNavigation(); } catch (e) { console.error('performNavigation failed on timer end', e); }
              return 0;
            }
            return s - 1;
          });
        }
      }, 300);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Dev menu: Shift + D
      if (e.shiftKey && e.key === 'D') {
        setShowDevMenu(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  useEffect(() => {
    // Listen for service worker updates
    const handleSwUpdate = () => {
      setShowUpdateAvailable(true);
    };

    window.addEventListener('sw-update-available', handleSwUpdate);
    return () => window.removeEventListener('sw-update-available', handleSwUpdate);
  }, []);

  useEffect(() => {
    if (showCompletionScreen) {
      // Workout completion confetti
      spawnConfetti('workout');

      localStorage.removeItem('bekah-builder-active-session');
      setHasActiveSession(false);

      // Check if we should show backup reminder
      if (shouldShowBackupReminder()) {
        setTimeout(() => {
          setShowBackupReminder(true);
        }, 2000); // Show after completion screen animation
      }
    }
  }, [showCompletionScreen]);


  // --- Helpers ---

  const getNewEncouragement = () => {
    let newIdx;
    do {
      newIdx = Math.floor(Math.random() * ENCOURAGEMENTS.length);
    } while (newIdx === lastEncouragementIdx && ENCOURAGEMENTS.length > 1);

    setLastEncouragementIdx(newIdx);
    return ENCOURAGEMENTS[newIdx];
  };

  const playTimerSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();
      const now = ctx.currentTime;

      const frequencies = [523.25, 659.25, 783.99];

      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + (i * 0.05));
        osc.stop(now + 2);
      });
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  const getLastWorkout = () => {
    if (workoutHistory.length === 0) return null;
    // Return the most recent completed workout that is A/B/C (ignore rest and hotYoga)
    const lastRelevant = workoutHistory.find(session => WORKOUT_ORDER.includes(session.workout));
    return lastRelevant || null;
  };

  const getNextWorkout = () => {
    const last = getLastWorkout();
    if (!last) return 'A';
    const lastIdx = WORKOUT_ORDER.indexOf(last.workout);
    return WORKOUT_ORDER[(lastIdx + 1) % WORKOUT_ORDER.length];
  };

  const startWorkout = (workoutKey: string) => {
    setSelectedWorkout(workoutKey);
    setSetupScreen(true);

    const workout = WORKOUTS[workoutKey];
    const defaults: Record<string, string> = {};
    workout.exercises.forEach(ex => {
      if (ex.options && ex.options.length > 0) {
        if (!exerciseChoices[ex.name]) {
          const first = ex.options[0];
          defaults[ex.name] = typeof first === 'string' ? first : (first as any).name;
        }
      }
    });
    if (Object.keys(defaults).length > 0) {
      setExerciseChoices(prev => ({ ...prev, ...defaults }));
    }
  };

  const resumeActiveSession = () => {
    try {
      const saved = localStorage.getItem('bekah-builder-active-session');
      if (saved) {
        const data = JSON.parse(saved);
        if (new Date().getTime() - data.timestamp > 12 * 60 * 60 * 1000) {
          localStorage.removeItem('bekah-builder-active-session');
          setHasActiveSession(false);
          alert("Saved session is too old.");
          return;
        }

        setSelectedWorkout(data.selectedWorkout);
        setExerciseChoices(data.exerciseChoices || {});
        setCurrentExerciseIdx(data.currentExerciseIdx);
        setCurrentSetIdx(data.currentSetIdx);
        setSessionData(data.sessionData);
        setWeight(data.weight);
        setReps(data.reps);
        setScreen('workout');
        setEncouragement("Welcome back! Let's finish this. 💪");
      }
    } catch (e) {
      console.error("Failed to resume", e);
      localStorage.removeItem('bekah-builder-active-session');
      setHasActiveSession(false);
    }
  };

  const beginWorkout = (workoutKey: string) => {
    setCurrentExerciseIdx(0);
    setCurrentSetIdx(0);
    setSessionData([]);
    setScreen('workout');
    setSetupScreen(false);
    setShowProgressView(false);
    setExpandedExercises({});
    // Don't reset disabledSupersets - preserve from setup screen

    const workout = WORKOUTS[workoutKey];
    loadExerciseData(workout, 0);

    setEncouragement(getNewEncouragement());
  };

  const loadExerciseData = (workout: WorkoutDef, exIdx: number) => {
    const exercise = getEffectiveExercise(workout.exercises[exIdx]);
    const repRange = exercise.repRange.match(/(\d+)-(\d+)/);
    if (repRange) {
      setReps(repRange[1]);
    }

    const lastPerf = getLastPerformance(exercise.name);
    if (lastPerf && lastPerf.length > 0 && !exercise.bodyweight) {
      setWeight(lastPerf[0].weight.toString());
    } else {
      setWeight('');
    }
  };

  const isSupersetActive = (exercise: ExerciseDef, partnerName?: string) => {
    if (!exercise.superset && !exercise.isSuperset) return false;
    const key = partnerName || exercise.superset || exercise.name;
    return !disabledSupersets.has(key);
  };

  const getEffectiveExercise = (exercise: ExerciseDef) => {
    if (exercise.options && exerciseChoices[exercise.name]) {
      const chosenOptionName = exerciseChoices[exercise.name];
      // find option entry (could be string or object)
      const found = exercise.options.find(opt => typeof opt === 'string' ? opt === chosenOptionName : (opt as any).name === chosenOptionName) as any;

      const isAssisted = chosenOptionName.toLowerCase().includes('assisted');

      let isBodyweight = (chosenOptionName.toLowerCase().includes('push-up') ||
        chosenOptionName.toLowerCase().includes('pullup') ||
        chosenOptionName.toLowerCase().includes('pushups')) && !isAssisted;

      const merged: any = { ...exercise, name: chosenOptionName };
      if (found && typeof found !== 'string') {
        if (found.repRange) merged.repRange = found.repRange;
        if (typeof found.bodyweight !== 'undefined') merged.bodyweight = found.bodyweight;
      }

      // override bodyweight detection if option indicates it
      if (typeof merged.bodyweight !== 'undefined' && merged.bodyweight !== null) {
        isBodyweight = !!merged.bodyweight;
      }

      merged.bodyweight = isBodyweight;
      return merged as ExerciseDef;
    }
    return exercise;
  };

  const logSet = () => {
    if (!selectedWorkout) return;
    const workout = WORKOUTS[selectedWorkout];
    const exercise = getEffectiveExercise(workout.exercises[currentExerciseIdx]);

    // Support stopwatch-based exercises (e.g., Dead Hangs)
    if (exercise.stopwatch) {
      // require a measured duration (use deadHangMs)
      const durationMs = deadHangMs;
      if (!durationMs || durationMs <= 0) return;

      const setData: SetLog = {
        exercise: exercise.name,
        set: currentSetIdx + 1,
        weight: 0,
        reps: 0,
        durationSeconds: durationMs / 1000,
        timestamp: new Date().toISOString(),
      };

      const newSessionData = [...sessionData, setData];
      setSessionData(newSessionData);

      // reset dead hang timer state and refs
      if (deadHangIntervalRef.current) {
        clearInterval(deadHangIntervalRef.current as any);
        deadHangIntervalRef.current = null;
      }
      deadHangStartRef.current = null;
      deadHangAccumRef.current = 0;
      setDeadHangActive(false);
      setDeadHangPaused(false);
      setDeadHangMs(0);

      // advance navigation same as below
      let nextExIdx = currentExerciseIdx;
      let nextSetIdx = currentSetIdx;
      let restTime = 120;

      const currentExDef = workout.exercises[currentExerciseIdx];
      const supersetEnabled = isSupersetActive(currentExDef, currentExDef.superset || (currentExDef.isSuperset ? workout.exercises[currentExerciseIdx - 1]?.superset : undefined));
      const isSupersetPair1 = exercise.superset && !exercise.isSuperset && supersetEnabled;
      const isSupersetPair2 = exercise.isSuperset && supersetEnabled;

      if (isSupersetPair1) {
        nextExIdx = currentExerciseIdx + 1;
        nextSetIdx = currentSetIdx;
        restTime = 60;
      } else if (isSupersetPair2) {
        if (currentSetIdx + 1 < exercise.sets) {
          nextExIdx = currentExerciseIdx - 1;
          nextSetIdx = currentSetIdx + 1;
          restTime = 120;
        } else {
          nextExIdx = currentExerciseIdx + 1;
          nextSetIdx = 0;
          restTime = 120;
        }
      } else {
        if (currentSetIdx + 1 < exercise.sets) {
          nextExIdx = currentExerciseIdx;
          nextSetIdx = currentSetIdx + 1;

          if (currentExerciseIdx === 0) restTime = 180;
          else restTime = 120;
        } else {
          nextExIdx = currentExerciseIdx + 1;
          nextSetIdx = 0;
          if (currentExerciseIdx === 0) restTime = 180;
          else restTime = 120;
        }
      }

      if (nextExIdx >= workout.exercises.length) {
        finishWorkout(newSessionData);
        return;
      }

      setPendingNav({ exIdx: nextExIdx, setIdx: nextSetIdx });
      setSuggestedRestTime(restTime);
      setShowRestChoice(true);
      return;
    }

    // Standard weight/reps flow
    if ((!exercise.bodyweight && !weight) || !reps) return;
    if (parseInt(reps) < 0 || (!exercise.bodyweight && parseFloat(weight) < 0)) return;

    const currentWeight = exercise.bodyweight ? 0 : parseFloat(weight);
    const currentReps = parseInt(reps);

    // 1. Log the data
    const setData: SetLog = {
      exercise: exercise.name,
      set: currentSetIdx + 1,
      weight: currentWeight,
      reps: currentReps,
      timestamp: new Date().toISOString(),
      // note: notes are now stored independently, not in sessionData
    };

    const newSessionData = [...sessionData, setData];
    setSessionData(newSessionData);

    // 2. Calculate Next State (Alternating Set Logic)
    let nextExIdx = currentExerciseIdx;
    let nextSetIdx = currentSetIdx;
    let restTime = 120; // default

    const currentExDef = workout.exercises[currentExerciseIdx];
    const supersetEnabled = isSupersetActive(currentExDef, currentExDef.superset || (currentExDef.isSuperset ? workout.exercises[currentExerciseIdx - 1]?.superset : undefined));
    const isSupersetPair1 = exercise.superset && !exercise.isSuperset && supersetEnabled;
    const isSupersetPair2 = exercise.isSuperset && supersetEnabled;

    if (isSupersetPair1) {
      nextExIdx = currentExerciseIdx + 1;
      nextSetIdx = currentSetIdx;
      restTime = 60;

      // Special override for Bulgarian Split Squats
      if (exercise.name.includes('Bulgarian') || exercise.name.includes('Split Squat')) {
        restTime = 120;
      }
    } else if (isSupersetPair2) {
      if (currentSetIdx + 1 < exercise.sets) {
        nextExIdx = currentExerciseIdx - 1;
        nextSetIdx = currentSetIdx + 1;
        restTime = 120;
      } else {
        nextExIdx = currentExerciseIdx + 1;
        nextSetIdx = 0;
        restTime = 120;
      }
    } else {
      // Standard Straight Sets
      if (currentSetIdx + 1 < exercise.sets) {
        nextExIdx = currentExerciseIdx;
        nextSetIdx = currentSetIdx + 1;

        if (currentExerciseIdx === 0) restTime = 180; // First exercise = 3 mins
        else if (exercise.name.toLowerCase().includes('abs')) restTime = 60;
        else restTime = 120;
      } else {
        // Finished exercise. Move to next.
        nextExIdx = currentExerciseIdx + 1;
        nextSetIdx = 0;
        // Special logic: If we just finished the MAIN exercise (Index 0), suggested rest is 3 mins
        if (currentExerciseIdx === 0) {
          restTime = 180;
        } else {
          restTime = 120;
        }
      }
    }

    // 3. Handle Workout Completion - check if ALL exercises are complete
    const allExercisesComplete = workout.exercises.every(ex => {
      const effectiveEx = getEffectiveExercise(ex);
      const completedSets = newSessionData.filter(s => s.exercise === effectiveEx.name).length;
      return completedSets >= ex.sets;
    });
    
    if (allExercisesComplete) {
      finishWorkout(newSessionData);
      return;
    }
    
    // If we've gone past the last exercise but not all are complete, find first incomplete
    if (nextExIdx >= workout.exercises.length) {
      for (let i = 0; i < workout.exercises.length; i++) {
        const ex = workout.exercises[i];
        const effectiveEx = getEffectiveExercise(ex);
        const completedSets = newSessionData.filter(s => s.exercise === effectiveEx.name).length;
        if (completedSets < ex.sets) {
          nextExIdx = i;
          nextSetIdx = completedSets;
          restTime = 120; // Regular rest when looping back
          break;
        }
      }
    }

    // 4. Set up state for Rest Screen
    setPendingNav({ exIdx: nextExIdx, setIdx: nextSetIdx });
    setSuggestedRestTime(restTime);
    setShowRestChoice(true);
  };

  const performNavigation = () => {
    if (!pendingNav || !selectedWorkout) return;
    const workout = WORKOUTS[selectedWorkout];

    // Find next incomplete exercise starting from pendingNav.exIdx
    let targetExIdx = pendingNav.exIdx;
    for (let i = pendingNav.exIdx; i < workout.exercises.length; i++) {
      const ex = workout.exercises[i];
      const effectiveEx = getEffectiveExercise(ex);
      const completedSets = sessionData.filter(s => s.exercise === effectiveEx.name).length;
      if (completedSets < ex.sets) {
        targetExIdx = i;
        break;
      }
    }

    // If target changed, reset set index to next incomplete set
    const targetEx = workout.exercises[targetExIdx];
    const effectiveTargetEx = getEffectiveExercise(targetEx);
    const targetCompletedSets = sessionData.filter(s => s.exercise === effectiveTargetEx.name).length;
    const targetSetIdx = targetExIdx === pendingNav.exIdx ? pendingNav.setIdx : targetCompletedSets;

    setCurrentExerciseIdx(targetExIdx);
    setCurrentSetIdx(targetSetIdx);

    const nextExercise = getEffectiveExercise(workout.exercises[targetExIdx]);

    const sessionSets = sessionData.filter(s => s.exercise === nextExercise.name);
    if (sessionSets.length > 0) {
      const lastSet = sessionSets[sessionSets.length - 1];
      if (lastSet.durationSeconds) {
        setWeight('');
        setReps('');
      } else {
        setWeight(lastSet.weight.toString());
        setReps(lastSet.reps.toString());
      }
    } else {
      loadExerciseData(workout, targetExIdx);
    }

    setEncouragement(getNewEncouragement());
    setPendingNav(null);
  }

  const startRest = (seconds: number) => {
    setTimerSeconds(seconds);
    timerEndRef.current = Date.now() + seconds * 1000;
    setTimerActive(true);
    setShowRestChoice(false);
  };

  const handleStartSet = () => {
    setTimerActive(false);
    setTimerSeconds(0);
    timerEndRef.current = null;
    setShowRestChoice(false);
    performNavigation();
  };

  const skipRest = () => {
    setShowRestChoice(false);
    setTimerActive(false);
    timerEndRef.current = null;
    performNavigation();
  }

  const toggleTimerActive = () => {
    if (timerActive) {
      // pause: calculate remaining and clear end
      if (timerEndRef.current) {
        const rem = Math.max(0, Math.round((timerEndRef.current - Date.now()) / 1000));
        setTimerSeconds(rem);
      }
      setTimerActive(false);
      timerEndRef.current = null;
    } else {
      // resume: set new end based on current seconds
      timerEndRef.current = Date.now() + (timerSeconds || suggestedRestTime) * 1000;
      setTimerActive(true);
    }
  }

  // Dead hang stopwatch controls (millisecond-accurate, with pause)
  const startDeadHang = () => {
    // reset any previous state
    if (deadHangIntervalRef.current) {
      clearInterval(deadHangIntervalRef.current as any);
      deadHangIntervalRef.current = null;
    }
    deadHangAccumRef.current = 0;
    deadHangStartRef.current = Date.now();
    setDeadHangMs(0);
    setDeadHangActive(true);
    setDeadHangPaused(false);
    deadHangIntervalRef.current = window.setInterval(() => {
      const start = deadHangStartRef.current || Date.now();
      setDeadHangMs(deadHangAccumRef.current + (Date.now() - start));
    }, 50);
  };

  const togglePauseDeadHang = () => {
    if (deadHangActive) {
      // pause
      if (deadHangIntervalRef.current) {
        clearInterval(deadHangIntervalRef.current as any);
        deadHangIntervalRef.current = null;
      }
      const start = deadHangStartRef.current || Date.now();
      deadHangAccumRef.current += (Date.now() - start);
      deadHangStartRef.current = null;
      setDeadHangActive(false);
      setDeadHangPaused(true);
    } else if (deadHangPaused) {
      // resume
      deadHangStartRef.current = Date.now();
      setDeadHangActive(true);
      setDeadHangPaused(false);
      deadHangIntervalRef.current = window.setInterval(() => {
        const start = deadHangStartRef.current || Date.now();
        setDeadHangMs(deadHangAccumRef.current + (Date.now() - start));
      }, 50);
    }
  };

  const stopDeadHang = () => {
    if (deadHangIntervalRef.current) {
      clearInterval(deadHangIntervalRef.current as any);
      deadHangIntervalRef.current = null;
    }
    // compute final ms
    let finalMs = deadHangAccumRef.current;
    if (deadHangStartRef.current) finalMs += (Date.now() - deadHangStartRef.current);
    deadHangStartRef.current = null;
    deadHangAccumRef.current = 0;
    setDeadHangMs(finalMs);
    setDeadHangActive(false);
    setDeadHangPaused(false);
    // Log the set using the duration captured (in ms)
    // pass duration to logSet via closure by setting state first, then calling
    // ensure we call logSet after state update - use setTimeout 0 to let state flush
    setTimeout(() => {
      logSet();
    }, 0);
  };

  const finishWorkout = (finalSessionData: SetLog[]) => {
    if (!selectedWorkout) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingTodayIdx = workoutHistory.findIndex(session => {
      const sessionDate = new Date(session.date);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === today.getTime();
    });

    const workoutSession: WorkoutSession = {
      workout: selectedWorkout,
      date: new Date().toISOString(),
      exercises: finalSessionData,
      preWorkoutCardio: preWorkoutCardio !== 'none' ? preWorkoutCardio : undefined
    };

    let newHistory;
    if (existingTodayIdx !== -1) {
      newHistory = [...workoutHistory];
      newHistory[existingTodayIdx] = workoutSession;
    } else {
      newHistory = [workoutSession, ...workoutHistory];
    }

    setWorkoutHistory(newHistory);
    // Adjust stars for replacement (remove previous day's star if present, add new)
    const starCountForType = (type: string | undefined | null) => {
      if (!type) return { gold: 0, silver: 0 };
      if (type === 'rest') return { gold: 0, silver: 1 };
      // treat hotYoga and regular workouts as gold
      return { gold: 1, silver: 0 };
    };

    const prevType = existingTodayIdx !== -1 ? workoutHistory[existingTodayIdx].workout : null;
    const prevStars = starCountForType(prevType as any);
    const newStars = starCountForType(selectedWorkout);
    const netGold = newStars.gold - prevStars.gold;
    const netSilver = newStars.silver - prevStars.silver;

    setStars(prev => ({
      gold: Math.max(0, prev.gold + netGold),
      silver: Math.max(0, prev.silver + netSilver)
    }));

    setShowCompletionScreen(true);
  };

  const getLastPerformance = (exerciseName: string) => {
    for (let session of workoutHistory) {
      const exerciseSets = session.exercises.filter(e => e.exercise === exerciseName);
      if (exerciseSets.length > 0) {
        return exerciseSets;
      }
    }
    return null;
  };

  const exportData = () => JSON.stringify({ history: workoutHistory, stars }, null, 2);

  const deleteWorkout = (date: Date) => {
    const dateStr = date.toDateString();
    // Find the workout being deleted to adjust stars
    const deletedSession = workoutHistory.find(session => {
      const sessionDate = new Date(session.date);
      return sessionDate.toDateString() === dateStr;
    });

    const newHistory = workoutHistory.filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate.toDateString() !== dateStr;
    });

    // Adjust stars for deleted workout
    if (deletedSession) {
      const starCountForType = (type: string | undefined | null) => {
        if (!type) return { gold: 0, silver: 0 };
        if (type === 'rest') return { gold: 0, silver: 1 };
        return { gold: 1, silver: 0 };
      };
      const deletedStars = starCountForType(deletedSession.workout);
      setStars(prev => ({
        gold: Math.max(0, prev.gold - deletedStars.gold),
        silver: Math.max(0, prev.silver - deletedStars.silver)
      }));
    }

    setWorkoutHistory(newHistory);
    setSelectedHistoryDate(null);
    setShowDeleteConfirm(false);
  };



  const importData = () => {
    try {
      const data = JSON.parse(importText);
      if (data.history && Array.isArray(data.history)) {
        setWorkoutHistory(data.history);
        setStars(data.stars || { gold: 0, silver: 0 });
        alert('History imported successfully!');
        setScreen('home');
        setImportText('');
      } else {
        alert('Invalid data format.');
      }
    } catch (e) {
      alert('Invalid JSON.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeMs = (ms: number) => {
    const totalMs = Math.max(0, Math.round(ms));
    const mins = Math.floor(totalMs / 60000);
    const secs = Math.floor((totalMs % 60000) / 1000);
    const centis = Math.floor((totalMs % 1000) / 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
  };

  const getRepRangeColor = (currentReps: string, repRange: string) => {
    const match = repRange.match(/(\d+)-(\d+)/);
    if (!match) return 'text-gray-800';

    const min = parseInt(match[1]);
    const max = parseInt(match[2]);
    const reps = parseInt(currentReps);

    if (reps < min) return 'text-red-500';
    if (reps <= max) return 'text-green-600';
    return 'text-orange-500';
  };

  const calculateStarPoints = () => {
    return stars.gold * 3 + stars.silver * 1;
  };

  const purchaseReward = (reward: Reward) => {
    const points = calculateStarPoints();
    if (points >= reward.cost) {
      // Robust approach: deduct points then re-compose into gold/silver
      const remainingPoints = points - reward.cost;
      const newGold = Math.floor(remainingPoints / 3);
      const newSilver = remainingPoints - newGold * 3;

      setStars({ gold: newGold, silver: newSilver });
      setPurchasedReward(reward);
      setShowRewardPurchaseScreen(true);

      // Shop purchase confetti (gold)
      spawnConfetti('shop');
    } else {
      alert(`You need ${reward.cost - points} more points!`);
    }
  };

  const addRestDay = () => {
    setShowRestDayDialog(true);
  };

  const confirmRestDay = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if there's an existing workout for today
    const existingTodayIdx = workoutHistory.findIndex(session => {
      const sessionDate = new Date(session.date);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === today.getTime();
    });

    // Create a rest day workout entry
    const restDaySession: WorkoutSession = {
      workout: 'rest',
      date: new Date().toISOString(),
      exercises: []
    };

    let newHistory;
    if (existingTodayIdx !== -1) {
      newHistory = [...workoutHistory];
      newHistory[existingTodayIdx] = restDaySession;
    } else {
      newHistory = [restDaySession, ...workoutHistory];
    }

    // Adjust stars: subtract previous day's star if present, add rest day's silver star
    const starCountForType = (type: string | undefined | null) => {
      if (!type) return { gold: 0, silver: 0 };
      if (type === 'rest') return { gold: 0, silver: 1 };
      return { gold: 1, silver: 0 };
    };
    const prevType = existingTodayIdx !== -1 ? workoutHistory[existingTodayIdx].workout : null;
    const prevStars = starCountForType(prevType as any);
    const newStars = starCountForType('rest');
    const netGold = newStars.gold - prevStars.gold;
    const netSilver = newStars.silver - prevStars.silver;

    setWorkoutHistory(newHistory);
    setStars(prev => ({
      gold: Math.max(0, prev.gold + netGold),
      silver: Math.max(0, prev.silver + netSilver)
    }));
    setShowRestDayDialog(false);
    // Blue confetti for rest day
    spawnConfetti('rest');
    setShowRestDayComplete(true);
  };

  const confirmHotYoga = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if there's an existing workout for today
    const existingTodayIdx = workoutHistory.findIndex(session => {
      const sessionDate = new Date(session.date);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === today.getTime();
    });

    // Create a hot yoga workout entry
    const hotYogaSession: WorkoutSession = {
      workout: 'hotYoga',
      date: new Date().toISOString(),
      exercises: []
    };

    let newHistory;
    if (existingTodayIdx !== -1) {
      newHistory = [...workoutHistory];
      newHistory[existingTodayIdx] = hotYogaSession;
    } else {
      newHistory = [hotYogaSession, ...workoutHistory];
    }

    // Adjust stars: remove previous star and add hotYoga gold star
    const starCountForType = (type: string | undefined | null) => {
      if (!type) return { gold: 0, silver: 0 };
      if (type === 'rest') return { gold: 0, silver: 1 };
      return { gold: 1, silver: 0 };
    };
    const prevType = existingTodayIdx !== -1 ? workoutHistory[existingTodayIdx].workout : null;
    const prevStars = starCountForType(prevType as any);
    const newStars = starCountForType('hotYoga');
    const netGold = newStars.gold - prevStars.gold;
    const netSilver = newStars.silver - prevStars.silver;

    setWorkoutHistory(newHistory);
    setStars(prev => ({
      gold: Math.max(0, prev.gold + netGold),
      silver: Math.max(0, prev.silver + netSilver)
    }));
    setShowHotYogaDialog(false);
    setShowHotYogaComplete(true);

    // Hot yoga confetti
    spawnConfetti('hotYoga');
  };

  const devAddStars = () => {
    if (devAddGold) setStars(prev => ({ ...prev, gold: prev.gold + parseInt(devAddGold) }));
    if (devAddSilver) setStars(prev => ({ ...prev, silver: prev.silver + parseInt(devAddSilver) }));
    setDevAddGold('');
    setDevAddSilver('');
    alert('Stars added!');
  };

  const getCompletedWorkoutDays = () => {
    return workoutHistory.filter(session => {
      return session.workout === 'A' || session.workout === 'B' || session.workout === 'C' || session.workout === 'hotYoga';
    }).length;
  };

  const shouldShowBackupReminder = () => {
    const completed = getCompletedWorkoutDays();
    return completed > 0 && completed % 5 === 0;
  };

  const shouldShowWeightIncreaseTip = (currentReps: string, repRange: string) => {
    const match = repRange.match(/(\d+)-(\d+)/);
    if (!match) return false;
    const max = parseInt(match[2]);
    return parseInt(currentReps) > max;
  };

  const shouldShowWeightDecreaseTip = (currentReps: string, repRange: string) => {
    const match = repRange.match(/(\d+)-(\d+)/);
    if (!match) return false;
    const min = parseInt(match[1]);
    return parseInt(currentReps) < min;
  };

  const getTrophyData = () => {
    const bests: Record<string, { weight: number, reps: number, date: string, isAssisted: boolean }> = {};

    workoutHistory.forEach(session => {
      session.exercises.forEach(set => {
        const name = set.exercise;
        const isAssisted = name.toLowerCase().includes('assisted');

        if (!bests[name]) {
          bests[name] = { weight: set.weight, reps: set.reps, date: session.date, isAssisted };
        } else {
          const currentBest = bests[name];
          let isNewBest = false;

          if (isAssisted) {
            // Assisted: Lower weight is better
            if (set.weight < currentBest.weight) isNewBest = true;
            else if (set.weight === currentBest.weight && set.reps > currentBest.reps) isNewBest = true;
          } else if (set.weight === 0) {
            // Bodyweight: More reps is better
            if (set.reps > currentBest.reps) isNewBest = true;
          } else {
            // Standard: Higher weight is better
            if (set.weight > currentBest.weight) isNewBest = true;
            else if (set.weight === currentBest.weight && set.reps > currentBest.reps) isNewBest = true;
          }

          if (isNewBest) {
            bests[name] = { weight: set.weight, reps: set.reps, date: session.date, isAssisted };
          }
        }
      });
    });
    return bests;
  };

  // Calendar Logic
  const getCalendarDays = () => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    const days = [];
    const startPadding = firstDay.getDay();
    for (let i = 0; i < startPadding; i++) { days.push(null); }
    for (let i = 1; i <= lastDay.getDate(); i++) { days.push(new Date(calendarYear, calendarMonth, i)); }
    return days;
  };

  const getWorkoutForDate = (date: Date | null) => {
    if (!date) return null;
    const dateStr = date.toDateString();
    return workoutHistory.find(session => {
      const sessionDate = new Date(session.date);
      return sessionDate.toDateString() === dateStr;
    });
  };

  const changeMonth = (delta: number) => {
    let newMonth = calendarMonth + delta;
    let newYear = calendarYear;
    if (newMonth > 11) { newMonth = 0; newYear++; }
    else if (newMonth < 0) { newMonth = 11; newYear--; }
    setCalendarMonth(newMonth);
    setCalendarYear(newYear);
  };

  // --- Renders ---

  if (setupScreen && selectedWorkout) {
    const workout = WORKOUTS[selectedWorkout];
    const exercisesWithOptions = workout.exercises.filter(ex => ex.options);

    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 font-sans">
        <style>{styles}</style>
        <div className="max-w-md mx-auto">
          <button
            onClick={() => {
              setSetupScreen(false);
              setSelectedWorkout(null);
              setDisabledSupersets(new Set()); // Clear superset toggles when leaving setup
            }}
            className="mb-4 text-pink-600 flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="bg-white rounded-2xl p-6 shadow-lg mb-4">
            <h2 className="text-2xl font-bold text-pink-600 mb-4">{workout.name}</h2>

            {/* Exercise List Preview */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-2">Workout Preview:</h3>
              <div className="space-y-2">
                {workout.exercises.map((ex, idx) => {
                  const effective = getEffectiveExercise(ex);
                  const isFirstInSuperset = ex.superset && !ex.isSuperset;
                  const supersetDisabled = isFirstInSuperset && !isSupersetActive(ex);
                  const isSecondInSuperset = ex.isSuperset;
                  const shouldIndent = isSecondInSuperset && isSupersetActive(ex);
                  
                  return (
                    <div key={idx} className={`text-sm text-gray-600 ${shouldIndent ? 'ml-4 border-l-2 border-pink-200 pl-2' : ''}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${shouldIndent ? 'bg-pink-300' : 'bg-pink-500'}`}></div>
                        <span>{effective.name}</span>
                        <span className="text-gray-400 text-xs">
                          ({ex.sets} × {effective.bodyweight ? 'AMRAP' : effective.repRange})
                        </span>
                        {isFirstInSuperset && (
                          <button
                            onClick={() => {
                              const newDisabled = new Set(disabledSupersets);
                              if (supersetDisabled) {
                                newDisabled.delete(ex.superset!);
                              } else {
                                newDisabled.add(ex.superset!);
                              }
                              setDisabledSupersets(newDisabled);
                            }}
                            className="px-2 py-1 rounded-lg text-xs font-semibold bg-pink-100 text-pink-700 hover:bg-pink-200 active:scale-95 transition-all shrink-0 ml-auto"
                          >
                            {supersetDisabled ? 'Enable SS' : 'Disable SS'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Exercise Swaps */}
            {exercisesWithOptions.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-100">
                <h3 className="font-semibold text-gray-700 mb-3">Choose Your Exercises:</h3>
                {exercisesWithOptions.map((exercise, idx) => (
                  <div key={idx} className="mb-4 last:mb-0">
                    <p className="text-sm font-semibold text-gray-700 mb-2">{exercise.name}:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {exercise.options?.map(opt => {
                        const optionName = typeof opt === 'string' ? opt : (opt as any).name;
                        return (
                          <button
                            key={optionName}
                            onClick={() => setExerciseChoices({ ...exerciseChoices, [exercise.name]: optionName })}
                            className={`p-3 rounded-lg border-2 transition-all text-sm ${exerciseChoices[exercise.name] === optionName
                              ? 'border-pink-500 bg-pink-50 text-pink-700 font-semibold'
                              : 'border-gray-200 bg-white text-gray-700'
                              }`}
                          >
                            {optionName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pre-Workout Cardio Selection */}
            <div className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-100">
              <h3 className="font-semibold text-gray-700 mb-3">Pre-Workout Cardio (optional):</h3>
              <div className="grid grid-cols-2 gap-2">
                {['None', 'Stairmaster', 'Rowing', 'Running'].map(option => {
                  const optKey = option === 'None' ? 'none' : option.toLowerCase();
                  const lastCardio = getLastWorkout()?.preWorkoutCardio;
                  const isLastDone = lastCardio && lastCardio === optKey;
                  return (
                    <button
                      key={option}
                      onClick={() => setPreWorkoutCardio(optKey)}
                      className={`p-3 rounded-lg border-2 transition-all text-sm ${preWorkoutCardio === optKey
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                        : 'border-gray-200 bg-white text-gray-700'
                        } ${isLastDone ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{option}</span>
                        {isLastDone && <span className="text-xs text-gray-400">last</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => beginWorkout(selectedWorkout)}
              className="w-full bg-pink-500 text-white rounded-xl p-4 font-bold text-lg shadow-lg hover:bg-pink-600 active:scale-95 transition-all mt-4"
            >
              Start Workout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Custom workout save handler
  const saveCustomWorkout = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existingTodayIdx = workoutHistory.findIndex(session => {
      const sd = new Date(session.date);
      sd.setHours(0, 0, 0, 0);
      return sd.getTime() === today.getTime();
    });

    const workoutSession: WorkoutSession = {
      workout: 'custom',
      date: new Date().toISOString(),
      exercises: [],
      customPlan: customText || undefined
    };

    let newHistory;
    if (existingTodayIdx !== -1) {
      newHistory = [...workoutHistory];
      newHistory[existingTodayIdx] = workoutSession;
    } else {
      newHistory = [workoutSession, ...workoutHistory];
    }
    setWorkoutHistory(newHistory);

    // adjust stars: remove previous day's stars, add gold for custom
    const starCountForType = (type: string | undefined | null) => {
      if (!type) return { gold: 0, silver: 0 };
      if (type === 'rest') return { gold: 0, silver: 1 };
      return { gold: 1, silver: 0 };
    };

    const prevType = existingTodayIdx !== -1 ? workoutHistory[existingTodayIdx].workout : null;
    const prevStars = starCountForType(prevType as any);
    const newStars = starCountForType('custom');
    const netGold = newStars.gold - prevStars.gold;
    const netSilver = newStars.silver - prevStars.silver;
    setStars(prev => ({
      gold: Math.max(0, prev.gold + netGold),
      silver: Math.max(0, prev.silver + netSilver)
    }));

    // Green confetti for custom workout
    spawnConfetti('custom');

    setShowCustomDialog(false);
    setCustomText('');
    setShowCustomComplete(true);
  };

  if (showCompletionScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 flex items-center justify-center overflow-hidden font-sans">
        <style>{styles}</style>
        {confetti.map(c => (
          <div
            key={c.id}
            className="confetti"
            style={{
              backgroundColor: c.color,
              left: c.left,
              animationDuration: c.animationDuration,
              animationDelay: c.delay
            }}
          />
        ))}
        <div className="max-w-md mx-auto text-center z-10 bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl">
          <div className="text-8xl mb-4 animate-bounce">🎉</div>
          <h1 className="text-4xl font-bold text-pink-600 mb-2">Workout Complete!</h1>
          <p className="text-xl text-pink-500 mb-8">You crushed it! 💪✨</p>

          <button
            onClick={() => {
              setShowCompletionScreen(false);
              setConfetti([]);
              setScreen('home');
            }}
            className="bg-pink-500 text-white rounded-xl px-8 py-4 font-bold text-lg shadow-lg hover:bg-pink-600 active:scale-95 transition-all w-full"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'home') {
    const lastWorkout = getLastWorkout();
    const nextWorkout = getNextWorkout();

    // Check if showing hot yoga or rest day complete
    if (showHotYogaComplete) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 flex items-center justify-center overflow-hidden font-sans">
          <style>{styles}</style>
          {confetti.map(c => (
            <div
              key={c.id}
              className="confetti"
              style={{
                backgroundColor: c.color,
                left: c.left,
                animationDuration: c.animationDuration,
                animationDelay: c.delay
              }}
            />
          ))}
          <div className="max-w-md mx-auto text-center z-10 bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl">
            <Flame className="mx-auto mb-4 animate-bounce text-orange-400" size={80} />
            <h1 className="text-4xl font-bold text-orange-600 mb-2">Hot Yoga Complete!</h1>
            <p className="text-xl text-orange-500 mb-2">You're on fire! 🌟</p>
            <p className="text-sm text-gray-600 mb-8">Gold star added to your collection!</p>

            <button
              onClick={() => {
                setShowHotYogaComplete(false);
                setConfetti([]);
              }}
              className="bg-orange-500 text-white rounded-xl px-8 py-4 font-bold text-lg shadow-lg hover:bg-orange-600 active:scale-95 transition-all w-full"
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }

    if (showRestDayComplete) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 flex items-center justify-center font-sans">
          <style>{styles}</style>
          {confetti.map(c => (
            <div
              key={c.id}
              className="confetti"
              style={{
                backgroundColor: c.color,
                left: c.left,
                animationDuration: c.animationDuration,
                animationDelay: c.delay
              }}
            />
          ))}
          <div className="max-w-md mx-auto text-center bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl">
            <Moon className="mx-auto mb-4 text-blue-400" size={80} />
            <h1 className="text-4xl font-bold text-blue-600 mb-2">Rest Day Logged!</h1>
            <p className="text-xl text-blue-500 mb-2">Recovery is important too! 💙</p>
            <p className="text-sm text-gray-600 mb-8">Silver star added to your collection!</p>

            <button
              onClick={() => {
                setShowRestDayComplete(false);
                setConfetti([]);
              }}
              className="bg-blue-500 text-white rounded-xl px-8 py-4 font-bold text-lg shadow-lg hover:bg-blue-600 active:scale-95 transition-all w-full"
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }

    if (showCustomComplete) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 flex items-center justify-center font-sans">
          <style>{styles}</style>
          {confetti.map(c => (
            <div
              key={c.id}
              className="confetti"
              style={{
                backgroundColor: c.color,
                left: c.left,
                animationDuration: c.animationDuration,
                animationDelay: c.delay
              }}
            />
          ))}
          <div className="max-w-md mx-auto text-center bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl">
            <Dumbbell className="mx-auto mb-4 text-green-400" size={80} />
            <h1 className="text-4xl font-bold text-green-600 mb-2">Custom Workout Logged!</h1>
            <p className="text-xl text-green-500 mb-2">You crushed it! 💪</p>
            <p className="text-sm text-gray-600 mb-8">Gold star added to your collection!</p>

            <button
              onClick={() => {
                setShowCustomComplete(false);
                setConfetti([]);
              }}
              className="bg-green-500 text-white rounded-xl px-8 py-4 font-bold text-lg shadow-lg hover:bg-green-600 active:scale-95 transition-all w-full"
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 font-sans pb-24">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8 pt-8">
            <h1 className="text-4xl font-bold text-pink-600 mb-2">Bekah Builder</h1>
            <p className="text-pink-500 text-sm font-medium">Baby Bekah's personal workout app <span className="text-yellow-400">★</span> <span className="text-blue-400">✨</span> <span className="text-green-400">💪</span></p>

            {lastWorkout && (
              <div className="mt-4 bg-white rounded-xl p-3 shadow-md text-sm inline-block">
                <p className="text-gray-600">
                  Next up: <span className="font-bold text-pink-600">Full Body {nextWorkout}</span>
                </p>
              </div>
            )}

            {/* Removed star showcase from home - moved to Shop */}
          </div>

          {hasActiveSession && (
            <button
              onClick={resumeActiveSession}
              className="w-full bg-white border-2 border-pink-500 rounded-2xl p-4 shadow-lg hover:bg-pink-50 transition-all active:scale-95 mb-6 flex items-center justify-center gap-3 group"
            >
              <div className="bg-pink-100 p-2 rounded-full group-hover:bg-pink-200 transition-colors">
                <RotateCcw className="text-pink-600" size={24} />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-pink-600">Resume Workout</h3>
                <p className="text-xs text-gray-500">Continue where you left off</p>
              </div>
            </button>
          )}

          <div className="space-y-3 mb-8">
            {Object.keys(WORKOUTS).map(key => {
              const isNext = nextWorkout === key;
              return (
                <button
                  key={key}
                  onClick={() => startWorkout(key)}
                  className={`w-full bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all active:scale-95 group relative overflow-hidden ${isNext ? 'ring-4 ring-pink-300 ring-opacity-50' : ''}`}
                >
                  {isNext && (
                    <div className="absolute top-0 top-0 inset-x-0 h-1 bg-gradient-to-r from-pink-400 via-rose-400 to-pink-400 animate-pulse"></div>
                  )}
                  <div className="absolute top-0 right-0 bg-pink-100 px-3 py-1 rounded-bl-xl text-xs font-bold text-pink-600">
                    {WORKOUTS[key].focus}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-left">
                      <h3 className="text-xl font-bold text-pink-600 group-hover:text-pink-700 transition-colors flex items-center gap-2">
                        {WORKOUTS[key].name}
                        {isNext && <span className="text-xs bg-pink-500 text-white px-2 py-0.5 rounded-full">Next</span>}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {getEffectiveExercise(WORKOUTS[key].exercises[0]).name}
                      </p>
                    </div>
                    <div className="bg-pink-50 p-3 rounded-full group-hover:bg-pink-100 transition-colors">
                      <Dumbbell className="text-pink-400" size={24} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <button
              onClick={() => setShowHotYogaDialog(true)}
              className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center gap-2"
            >
              <div className="bg-orange-100 rounded-full p-3">
                <Flame className="text-orange-400" size={24} />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-bold text-orange-600 hover:text-orange-700 transition-colors">
                  Hot Yoga
                </h3>
              </div>
            </button>
            <button
              onClick={addRestDay}
              className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center gap-2"
            >
              <div className="bg-blue-100 rounded-full p-3">
                <Moon className="text-blue-400" size={24} />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">
                  Rest Day
                </h3>
              </div>
            </button>
            <button
              onClick={() => setShowCustomDialog(true)}
              className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center gap-2"
            >
              <div className="bg-green-100 rounded-full p-3">
                <Dumbbell className="text-green-400" size={24} />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-bold text-green-600 hover:text-green-700 transition-colors">
                  Custom
                </h3>
              </div>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-8">
            <button
              onClick={() => setScreen('history')}
              className="bg-white rounded-xl p-3 shadow-md hover:shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center gap-1"
            >
              <Calendar className="text-pink-400" size={20} />
              <p className="text-xs font-semibold text-gray-700">History</p>
            </button>
            <button
              onClick={() => setScreen('trophy')}
              className="bg-white rounded-xl p-3 shadow-md hover:shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center gap-1"
            >
              <Trophy className="text-yellow-400" size={20} />
              <p className="text-xs font-semibold text-gray-700">Records</p>
            </button>
            <button
              onClick={() => setScreen('shop')}
              className="bg-white rounded-xl p-3 shadow-md hover:shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center gap-1"
            >
              <Gift className="text-purple-400" size={20} />
              <p className="text-xs font-semibold text-gray-700">Shop</p>
            </button>
            <button
              onClick={() => setScreen('export')}
              className="bg-white rounded-xl p-3 shadow-md hover:shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center gap-1"
            >
              <Save className="text-red-400" size={20} />
              <p className="text-xs font-semibold text-gray-700">Data</p>
            </button>
          </div>

          <div className="text-center text-xs text-pink-300 font-medium mt-8">
            <p>Copyright Steve from the CRA, 2025 • v2.2.0</p>
          </div>
        </div>

        {/* Hot Yoga Dialog */}
        {showHotYogaDialog && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-xl text-center">
              <Flame className="text-orange-400 mx-auto mb-4 animate-bounce" size={56} />
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Hot Yoga</h3>
              <p className="text-gray-600 mb-2">Log a hot yoga session for today?</p>
              <p className="text-xs text-gray-500 mb-6">(this will overwrite any previous workout for today)</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowHotYogaDialog(false)}
                  className="flex-1 bg-gray-200 rounded-xl p-3 text-gray-700 font-semibold active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmHotYoga}
                  className="flex-1 bg-orange-500 text-white rounded-xl p-3 font-semibold active:scale-95 transition-all hover:bg-orange-600"
                >
                  Yes!
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Workout Dialog */}
        {showCustomDialog && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-xl text-center">
              <Dumbbell className="text-green-400 mx-auto mb-4" size={56} />
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Custom Workout</h3>
              <p className="text-gray-600 mb-2">Log a custom workout for today?</p>
              <p className="text-xs text-gray-500 mb-4">(this will overwrite any previous workout for today)</p>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="e.g. RDLs - 135lbs - 3 sets of 10, 9, 8 reps"
                className="w-full h-24 p-3 border-2 border-gray-200 rounded-lg focus:border-green-400 outline-none text-sm resize-none mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowCustomDialog(false); setCustomText(''); }}
                  className="flex-1 bg-gray-200 rounded-xl p-3 text-gray-700 font-semibold active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCustomWorkout}
                  disabled={!customText.trim()}
                  className="flex-1 bg-green-500 text-white rounded-xl p-3 font-semibold active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600"
                >
                  Yes!
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dev Menu */}
        {showDevMenu && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Dev Menu (Shift+D)</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Add Gold Stars</label>
                  <input
                    type="number"
                    value={devAddGold}
                    onChange={(e) => setDevAddGold(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg p-2 focus:border-pink-400 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Add Silver Stars</label>
                  <input
                    type="number"
                    value={devAddSilver}
                    onChange={(e) => setDevAddSilver(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg p-2 focus:border-pink-400 outline-none"
                    placeholder="0"
                  />
                </div>
                <button
                  onClick={() => {
                    setShowBackupReminder(true);
                    setShowDevMenu(false);
                  }}
                  className="w-full bg-blue-100 text-blue-700 rounded-lg p-2 text-sm font-semibold active:scale-95 transition-all"
                >
                  Show Backup Reminder
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDevMenu(false)}
                    className="flex-1 bg-gray-200 rounded-xl p-3 text-gray-700 font-semibold active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={devAddStars}
                    className="flex-1 bg-purple-500 text-white rounded-xl p-3 font-semibold active:scale-95 transition-all hover:bg-purple-600"
                  >
                    Add Stars
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rest Day Confirmation Dialog */}
        {showRestDayDialog && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-xl text-center">
              <Moon className="text-blue-400 mx-auto mb-4" size={56} />
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Rest Day</h3>
              <p className="text-gray-600 mb-2">Log a rest day for today?</p>
              <p className="text-xs text-gray-500 mb-6">(this will overwrite any previous workout for today)</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRestDayDialog(false)}
                  className="flex-1 bg-gray-200 rounded-xl p-3 text-gray-700 font-semibold active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRestDay}
                  className="flex-1 bg-blue-500 text-white rounded-xl p-3 font-semibold active:scale-95 transition-all hover:bg-blue-600"
                >
                  Yes!
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hot Yoga Complete Screen */}
        {showHotYogaComplete && (
          <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 flex items-center justify-center overflow-hidden font-sans">
            <style>{styles}</style>
            {confetti.map(c => (
              <div
                key={c.id}
                className="confetti"
                style={{
                  backgroundColor: c.color,
                  left: c.left,
                  animationDuration: c.animationDuration,
                  animationDelay: c.delay
                }}
              />
            ))}
            <div className="max-w-md mx-auto text-center z-10 bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl">
              <div className="text-8xl mb-4 animate-bounce">🔥</div>
              <h1 className="text-4xl font-bold text-orange-600 mb-2">Hot Yoga Complete!</h1>
              <p className="text-xl text-orange-500 mb-2">You're on fire! 🌟</p>
              <p className="text-sm text-gray-600 mb-8">Gold star added to your collection!</p>

              <button
                onClick={() => {
                  setShowHotYogaComplete(false);
                  setConfetti([]);
                  setScreen('home');
                }}
                className="bg-orange-500 text-white rounded-xl px-8 py-4 font-bold text-lg shadow-lg hover:bg-orange-600 active:scale-95 transition-all w-full"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}

        {/* Rest Day Complete Screen */}
        {showRestDayComplete && (
          <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 flex items-center justify-center font-sans">
            <div className="max-w-md mx-auto text-center bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl">
              <div className="text-8xl mb-4">😴</div>
              <h1 className="text-4xl font-bold text-blue-600 mb-2">Rest Day Logged!</h1>
              <p className="text-xl text-blue-500 mb-2">Recovery is important too! 💙</p>
              <p className="text-sm text-gray-600 mb-8">Silver star added to your collection!</p>

              <button
                onClick={() => {
                  setShowRestDayComplete(false);
                  setScreen('home');
                }}
                className="bg-blue-500 text-white rounded-xl px-8 py-4 font-bold text-lg shadow-lg hover:bg-blue-600 active:scale-95 transition-all w-full"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}

        {/* Backup Reminder Dialog */}
        {showBackupReminder && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-xl">
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Great Progress! 🎉</h3>
              <p className="text-gray-600 mb-6">You've completed {getCompletedWorkoutDays()} workouts! Would you like to back up your data to keep it safe?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBackupReminder(false)}
                  className="flex-1 bg-gray-200 rounded-xl p-3 text-gray-700 font-semibold active:scale-95 transition-all"
                >
                  Later
                </button>
                <button
                  onClick={() => {
                    setShowBackupReminder(false);
                    setScreen('export');
                  }}
                  className="flex-1 bg-blue-500 text-white rounded-xl p-3 font-semibold active:scale-95 transition-all hover:bg-blue-600"
                >
                  Back Up Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Update Available Toast */}
        {showUpdateAvailable && (
          <div className="fixed bottom-20 left-4 right-4 z-50 animate-bounce">
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl p-4 shadow-2xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="font-bold text-sm">Update Available! ✨</p>
                  <p className="text-xs opacity-90">Restart the app to get the latest version</p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-white text-pink-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-pink-50 active:scale-95 transition-all shrink-0"
                >
                  Restart
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (screen === 'workout' && selectedWorkout) {
    const workout = WORKOUTS[selectedWorkout];
    const exercise = getEffectiveExercise(workout.exercises[currentExerciseIdx]);
    const lastPerformance = getLastPerformance(exercise.name);

    // Resolve Superset partner names
    let supersetPartnerName = '';
    let supersetActiveForExercise = false;
    if (exercise.superset && !exercise.isSuperset) {
      // find partner exercise object to resolve selected option name
      const partnerEx = workout.exercises.find(e => e.name === exercise.superset);
      supersetPartnerName = partnerEx ? getEffectiveExercise(partnerEx).name : exercise.superset;
      supersetActiveForExercise = isSupersetActive(workout.exercises[currentExerciseIdx], exercise.superset);
    } else if (exercise.isSuperset) {
      const prevEx = getEffectiveExercise(workout.exercises[currentExerciseIdx - 1]);
      supersetPartnerName = prevEx.name;
      const prevExDef = workout.exercises[currentExerciseIdx - 1];
      supersetActiveForExercise = isSupersetActive(prevExDef, prevExDef.superset);
    }

    if (showExitConfirm) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 flex items-center justify-center font-sans">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Exit Workout?</h2>
              <p className="text-gray-600 mb-6">Your active progress will be cleared.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 bg-gray-200 rounded-xl p-3 text-gray-700 font-semibold active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowExitConfirm(false);
                    localStorage.removeItem('bekah-builder-active-session');
                    setHasActiveSession(false);
                    setScreen('home');
                  }}
                  className="flex-1 bg-red-500 text-white rounded-xl p-3 font-semibold active:scale-95 transition-all hover:bg-red-600"
                >
                  Exit
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (showRestChoice) {
      const restOptions = [60, 120, 180];

      return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 flex items-center justify-center font-sans">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <Timer className="text-pink-400 mx-auto mb-4" size={48} />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Rest Time</h2>
              <p className="text-gray-600 mb-6">Suggested: {suggestedRestTime / 60} min</p>

              <div className="space-y-3">
                {restOptions.map(seconds => (
                  <button
                    key={seconds}
                    onClick={() => startRest(seconds)}
                    className={`w-full rounded-xl p-4 font-bold text-lg shadow-lg active:scale-95 transition-all flex justify-between items-center px-6 ${seconds === suggestedRestTime
                      ? 'bg-pink-500 text-white hover:bg-pink-600 ring-4 ring-pink-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    <span>{seconds / 60} {seconds === 60 ? 'minute' : 'minutes'}</span>
                    {seconds === suggestedRestTime && <span className="text-xs bg-white/20 px-2 py-1 rounded">Recommended</span>}
                  </button>
                ))}
                <button
                  onClick={() => skipRest()}
                  className="w-full text-gray-400 text-sm font-semibold py-2 hover:text-gray-600"
                >
                  Skip Rest
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (timerActive || (!timerActive && timerSeconds > 0 && showRestChoice === false)) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 flex items-center justify-center font-sans">
          <style>{styles}</style>
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center relative overflow-hidden">
              <div
                className="absolute bottom-0 left-0 h-2 bg-pink-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(timerSeconds / (suggestedRestTime || 120)) * 100}%` }}
              ></div>

              <Timer className={`text-pink-400 mx-auto mb-4 ${timerActive ? 'animate-pulse' : ''}`} size={48} />
              <p className="text-sm text-gray-600 mb-2">{timerActive ? 'Resting...' : 'Paused'}</p>
              <p className="text-7xl font-bold text-pink-600 mb-8 font-mono tabular-nums">{formatTime(timerSeconds)}</p>

              <div className="flex gap-3">
                <button
                  onClick={toggleTimerActive}
                  className="flex-1 bg-gray-200 rounded-xl p-3 text-gray-700 font-semibold active:scale-95 transition-all"
                >
                  {timerActive ? 'Pause' : 'Resume'}
                </button>
                <button
                  onClick={handleStartSet}
                  className="flex-1 bg-pink-500 text-white rounded-xl p-3 font-semibold active:scale-95 transition-all shadow-lg shadow-pink-200"
                >
                  Start Set
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (showProgressView) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 font-sans">
          <div className="max-w-md mx-auto">
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => setShowProgressView(false)}
                className="text-pink-600 flex items-center gap-2 font-semibold bg-white px-3 py-1.5 rounded-lg shadow-sm"
              >
                <ArrowLeft size={20} />
                <span>Back</span>
              </button>
              <h2 className="text-xl font-bold text-pink-600">Workout Progress</h2>
              <div className="w-16"></div>
            </div>

            {/* Modify Workout Button */}
            <div className="bg-white rounded-2xl p-4 shadow-lg mb-4">
              <button
                onClick={() => {
                  setShowSwapExercise(true);
                  setShowProgressView(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 active:scale-95 transition-all"
              >
                <RotateCcw size={18} />
                <span>Modify Workout</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-lg space-y-2">
              {workout.exercises.map((ex, idx) => {
                const effectiveEx = getEffectiveExercise(ex);
                const exerciseSets = sessionData.filter(s => s.exercise === effectiveEx.name);
                const isComplete = exerciseSets.length >= ex.sets;
                const isCurrent = idx === currentExerciseIdx;
                
                // Check if this is first in superset and superset is active
                const isFirstInSuperset = ex.superset && !ex.isSuperset && isSupersetActive(ex, ex.superset);
                const isSecondInSuperset = ex.isSuperset && idx > 0 && isSupersetActive(workout.exercises[idx - 1], workout.exercises[idx - 1].superset);

                return (
                  <div key={idx} className={`border-b last:border-0 border-gray-100 pb-2 last:pb-0 ${isFirstInSuperset || isSecondInSuperset ? 'bg-gradient-to-r from-pink-50/30 to-transparent' : ''}`}>
                    <div className={`flex items-center gap-2 ${isSecondInSuperset ? 'ml-4 border-l-4 border-pink-400 pl-2' : isFirstInSuperset ? 'border-l-4 border-pink-400 pl-2' : ''}`}>
                      <button
                        onClick={() => setExpandedExercises({
                          ...expandedExercises,
                          [idx]: !expandedExercises[idx]
                        })}
                        className={`flex-1 flex items-center justify-between p-3 rounded-xl transition-colors ${isCurrent ? 'bg-pink-50' : 'hover:bg-gray-50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${isComplete ? 'bg-green-500' : isCurrent ? 'bg-pink-500' : 'bg-gray-300'}`}></div>
                          <span className={`text-sm font-semibold ${isCurrent ? 'text-pink-700' : 'text-gray-700'}`}>
                            {effectiveEx.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <span className="text-xs font-medium">{exerciseSets.length}/{ex.sets}</span>
                          {expandedExercises[idx] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                      </button>
                      {!isCurrent && (
                        <button
                          onClick={() => {
                            setCurrentExerciseIdx(idx);
                            // Set to the next incomplete set
                            setCurrentSetIdx(exerciseSets.length);
                            setShowProgressView(false);
                          }}
                          disabled={isComplete}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                            isComplete
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-pink-100 text-pink-700 hover:bg-pink-200 active:scale-95'
                          }`}
                        >
                          Switch
                        </button>
                      )}
                    </div>

                    {expandedExercises[idx] && (
                      <div className="ml-4 mt-2 space-y-2 border-l-2 border-gray-100 pl-4 mb-2">
                        {Array.from({ length: ex.sets }).map((_, setIdx) => {
                          const setData = exerciseSets.find(s => s.set === setIdx + 1);
                          return (
                            <div
                              key={setIdx}
                              className="w-full text-left p-2 rounded hover:bg-pink-50 transition-all flex justify-between items-center"
                            >
                              <span className="text-xs text-gray-500 font-medium">Set {setIdx + 1}</span>
                              {setData ? (
                                <div className="text-xs font-mono font-semibold text-gray-700">
                                  {setData.weight > 0 ? `${setData.weight}lb × ` : ''}{setData.reps}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400 italic">
                                  --
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (showSwapExercise) {
      // Get all exercises with options
      const exercisesWithOptions = workout.exercises.filter(ex => ex.options && ex.options.length > 0);
      
      // Check if any exercises will lose recorded sets due to pending swaps
      const willLoseSets = exercisesWithOptions.some(ex => {
        const currentEffective = getEffectiveExercise(ex);
        const pendingChoice = pendingSwaps[ex.name];
        const exerciseSets = sessionData.filter(s => s.exercise === currentEffective.name);
        return exerciseSets.length > 0 && pendingChoice && pendingChoice !== currentEffective.name;
      });

      const hasChanges = Object.keys(pendingSwaps).length > 0 || pendingSupersetChanges.size > 0;

      return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 font-sans">
          <style>{styles}</style>
          <div className="max-w-md mx-auto">
              <button
                onClick={() => {
                  setPendingSwaps({});
                  setPendingSupersetChanges(new Set());
                  setShowSwapExercise(false);
                }}
                className="mb-4 text-pink-600 flex items-center gap-2"
              >
                <ArrowLeft size={20} />
                <span>Back</span>
              </button>            <div className="bg-white rounded-2xl p-6 shadow-lg mb-4">
              <h2 className="text-2xl font-bold text-pink-600 mb-4">{workout.name}</h2>

              {/* Workout Preview */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-2">Workout Preview:</h3>
                <div className="space-y-2">
                  {workout.exercises.map((ex, idx) => {
                    // Determine effective exercise with pending swaps applied
                    let effectiveName = ex.name;
                    let effectiveRepRange = ex.repRange;
                    let effectiveBodyweight = ex.bodyweight;
                    
                    if (ex.options && (exerciseChoices[ex.name] || pendingSwaps[ex.name])) {
                      const chosenOptionName = pendingSwaps[ex.name] || exerciseChoices[ex.name];
                      const found = ex.options.find(opt => 
                        typeof opt === 'string' ? opt === chosenOptionName : (opt as any).name === chosenOptionName
                      ) as any;
                      
                      effectiveName = chosenOptionName;
                      
                      if (found && typeof found !== 'string') {
                        if (found.repRange) effectiveRepRange = found.repRange;
                        if (typeof found.bodyweight !== 'undefined') effectiveBodyweight = found.bodyweight;
                      }
                      
                      const isAssisted = chosenOptionName.toLowerCase().includes('assisted');
                      const isPushupOrPullup = (chosenOptionName.toLowerCase().includes('push-up') ||
                        chosenOptionName.toLowerCase().includes('pullup') ||
                        chosenOptionName.toLowerCase().includes('pushups')) && !isAssisted;
                      
                      if (typeof effectiveBodyweight === 'undefined' || effectiveBodyweight === null) {
                        effectiveBodyweight = isPushupOrPullup;
                      }
                    }
                    
                    const isFirstInSuperset = ex.superset && !ex.isSuperset;
                    const isSecondInSuperset = ex.isSuperset;
                    
                    // For second exercise in superset, get the partner's superset name
                    const supersetName = isSecondInSuperset && idx > 0 
                      ? workout.exercises[idx - 1].superset 
                      : ex.superset;
                    
                    // Check if this superset will be disabled after pending changes
                    const currentlyDisabled = disabledSupersets.has(supersetName || '');
                    const willBeDisabled = pendingSupersetChanges.has(supersetName || '') ? !currentlyDisabled : currentlyDisabled;
                    const shouldIndent = isSecondInSuperset && !willBeDisabled;
                    
                    return (
                      <div key={idx} className={`text-sm text-gray-600 ${shouldIndent ? 'ml-4 border-l-2 border-pink-200 pl-2' : ''}`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${shouldIndent ? 'bg-pink-300' : 'bg-pink-500'}`}></div>
                          <span>{effectiveName}</span>
                          <span className="text-gray-400 text-xs">
                            ({ex.sets} × {effectiveBodyweight ? 'AMRAP' : effectiveRepRange})
                          </span>
                          {isFirstInSuperset && (
                            <button
                              onClick={() => {
                                const newPendingChanges = new Set(pendingSupersetChanges);
                                if (newPendingChanges.has(ex.superset!)) {
                                  newPendingChanges.delete(ex.superset!);
                                } else {
                                  newPendingChanges.add(ex.superset!);
                                }
                                setPendingSupersetChanges(newPendingChanges);
                              }}
                              className="px-2 py-1 rounded-lg text-xs font-semibold bg-pink-100 text-pink-700 hover:bg-pink-200 active:scale-95 transition-all shrink-0 ml-auto"
                            >
                              {willBeDisabled ? 'Enable SS' : 'Disable SS'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Exercise Swaps */}
              {exercisesWithOptions.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-100">
                  <h3 className="font-semibold text-gray-700 mb-3">Choose Your Exercises:</h3>
                  {exercisesWithOptions.map((exercise, idx) => {
                    const currentEffective = getEffectiveExercise(exercise);
                    const selectedOption = pendingSwaps[exercise.name] || currentEffective.name;
                    
                    return (
                      <div key={idx} className="mb-4 last:mb-0">
                        <p className="text-sm font-semibold text-gray-700 mb-2">{exercise.name}:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {exercise.options?.map(opt => {
                            const optionName = typeof opt === 'string' ? opt : (opt as any).name;
                            const isSelected = selectedOption === optionName;
                            
                            return (
                              <button
                                key={optionName}
                                onClick={() => {
                                  if (optionName === currentEffective.name) {
                                    // Remove from pending swaps if selecting current
                                    const newPending = { ...pendingSwaps };
                                    delete newPending[exercise.name];
                                    setPendingSwaps(newPending);
                                  } else {
                                    // Add to pending swaps
                                    setPendingSwaps({
                                      ...pendingSwaps,
                                      [exercise.name]: optionName
                                    });
                                  }
                                }}
                                className={`p-3 rounded-lg border-2 transition-all text-sm ${
                                  isSelected
                                    ? 'border-pink-500 bg-pink-50 text-pink-700 font-semibold'
                                    : 'border-gray-200 bg-white text-gray-700'
                                }`}
                              >
                                {optionName}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Warning Message */}
              {willLoseSets && (
                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 mb-4 flex items-start gap-2">
                  <Info size={16} className="text-yellow-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-800 font-medium text-left">
                    Swapping exercises will delete any sets already recorded for those exercises today
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setPendingSwaps({});
                    setPendingSupersetChanges(new Set());
                    setShowSwapExercise(false);
                  }}
                  className="flex-1 bg-gray-200 rounded-xl p-3 text-gray-700 font-semibold active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Apply all pending swaps
                    if (hasChanges) {
                      const newChoices = { ...exerciseChoices };
                      const exercisesToClear: string[] = [];
                      
                      Object.entries(pendingSwaps).forEach(([exerciseName, newOption]) => {
                        newChoices[exerciseName] = newOption;
                        
                        // Track old exercise names that need data cleared
                        const exercise = workout.exercises.find(ex => ex.name === exerciseName);
                        if (exercise) {
                          const oldEffective = getEffectiveExercise(exercise);
                          exercisesToClear.push(oldEffective.name);
                        }
                      });
                      
                      setExerciseChoices(newChoices);
                      
                      // Apply superset changes
                      const newDisabled = new Set(disabledSupersets);
                      pendingSupersetChanges.forEach(supersetName => {
                        if (newDisabled.has(supersetName)) {
                          newDisabled.delete(supersetName);
                        } else {
                          newDisabled.add(supersetName);
                        }
                      });
                      setDisabledSupersets(newDisabled);
                      
                      // Clear session data for swapped exercises
                      if (exercisesToClear.length > 0) {
                        setSessionData(sessionData.filter(s => !exercisesToClear.includes(s.exercise)));
                      }
                    }
                    
                    setPendingSwaps({});
                    setPendingSupersetChanges(new Set());
                    setShowSwapExercise(false);
                  }}
                  disabled={!hasChanges}
                  className={`flex-1 rounded-xl p-3 font-semibold transition-all ${
                    hasChanges
                      ? 'bg-pink-500 text-white hover:bg-pink-600 active:scale-95'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Confirm Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 pb-20 font-sans overflow-hidden">
        <style>{styles}</style>
        {confetti.map(c => (
          <div
            key={c.id}
            className="confetti"
            style={{
              backgroundColor: c.color,
              left: c.left,
              animationDuration: c.animationDuration,
              animationDelay: c.delay
            }}
          />
        ))}

        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setShowExitConfirm(true)}
              className="text-pink-600 flex items-center gap-2 font-medium"
            >
              <ArrowLeft size={20} />
              <span>Exit</span>
            </button>
            <button
              onClick={() => setShowProgressView(true)}
              className="text-pink-600 flex items-center gap-2 font-medium bg-white px-3 py-1.5 rounded-full shadow-sm"
            >
              <List size={18} />
              <span>{currentExerciseIdx + 1}/{workout.exercises.length}</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg mb-4 relative">
            {/* Header Area */}
            <div className="mb-6">
              {supersetActiveForExercise ? (
                <div className="bg-pink-50 rounded-xl p-3 border border-pink-100">
                  <div className="flex items-center justify-between gap-3">
                    {/* Left Side (Ex 1) */}
                    <div className={`flex-1 text-center p-3 rounded-xl transition-all ${!exercise.isSuperset ? 'bg-white shadow-md ring-2 ring-pink-200 scale-105 z-10' : 'opacity-60 grayscale-[0.5]'}`}>
                      <div className="flex items-center justify-center gap-2">
                        <p className={`font-bold text-gray-800 leading-tight ${!exercise.isSuperset ? 'text-lg' : 'text-sm'}`}>
                          {exercise.isSuperset ? supersetPartnerName : exercise.name}
                        </p>
                        {!exercise.isSuperset && (
                          <button
                            onClick={() => {
                              setShowNotesEditor(true);
                              setCurrentNoteExercise(exercise.isSuperset ? supersetPartnerName : exercise.name);
                            }}
                            className="hover:bg-pink-100 p-1.5 rounded transition-colors"
                            title="Add notes"
                          >
                            <PenTool size={16} className="text-blue-600" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-pink-300 font-bold text-xl">➜</div>
                    {/* Right Side (Ex 2) */}
                    <div className={`flex-1 text-center p-3 rounded-xl transition-all ${exercise.isSuperset ? 'bg-white shadow-md ring-2 ring-pink-200 scale-105 z-10' : 'opacity-60 grayscale-[0.5]'}`}>
                      <div className="flex items-center justify-center gap-2">
                        <p className={`font-bold text-gray-800 leading-tight ${exercise.isSuperset ? 'text-lg' : 'text-sm'}`}>
                          {exercise.isSuperset ? exercise.name : supersetPartnerName}
                        </p>
                        {exercise.isSuperset && (
                          <button
                            onClick={() => {
                              setShowNotesEditor(true);
                              setCurrentNoteExercise(exercise.name);
                            }}
                            className="hover:bg-pink-100 p-1.5 rounded transition-colors"
                            title="Add notes"
                          >
                            <PenTool size={16} className="text-blue-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-2xl font-bold text-pink-600 leading-tight text-center mb-1">{exercise.name}</h2>
                  <button
                    onClick={() => {
                      setShowNotesEditor(true);
                      setCurrentNoteExercise(exercise.name);
                    }}
                    className="hover:bg-pink-100 p-2 rounded transition-colors mt-1"
                    title="Add notes"
                  >
                    <PenTool size={18} className="text-blue-600" />
                  </button>
                </div>
              )}
            </div>

            {/* Set Info */}
            <div className="flex justify-center items-center gap-2 text-sm text-gray-500 font-medium mb-4">
              <span>Set {sessionData.filter(s => s.exercise === exercise.name).length + 1} of {exercise.sets}</span>
              {!exercise.bodyweight && (
                <>
                  <span>•</span>
                  <span>Target: {exercise.repRange}</span>
                </>
              )}
            </div>

            {/* Note */}
            {exercise.note && (
              <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 mb-6 text-center flex items-start gap-2">
                <Info size={16} className="text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-800 font-medium text-left">{exercise.note}</p>
              </div>
            )}

            {/* Previous Performance */}
            {lastPerformance && (
              <div className="bg-blue-50 rounded-xl p-3 mb-6 border border-blue-100">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Last Time</p>
                  <p className="text-xs text-blue-400">{new Date(getLastWorkout()?.date || '').toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 mb-2">
                  {lastPerformance.map((set, idx) => (
                    <div key={idx} className="bg-white rounded px-2 py-1 text-xs font-mono text-blue-800 border border-blue-100 whitespace-nowrap">
                      {set.durationSeconds ? formatTimeMs(Math.round(set.durationSeconds * 1000)) : `${set.weight > 0 ? `${set.weight}lb × ` : ''}${set.reps}`}
                    </div>
                  ))}
                </div>
                {exerciseNotes[exercise.name] && (
                  <div className="text-xs text-blue-700 mt-2 pt-2 border-t border-blue-100 flex items-center gap-2">
                    <PenTool size={14} className="text-blue-600 shrink-0" />
                    <span>{exerciseNotes[exercise.name]}</span>
                  </div>
                )}
              </div>
            )}

            {/* Inputs - show stopwatch controls for exercises that record duration */}
            {exercise.stopwatch ? (
              <div className="mb-6 text-center">
                <label className="block text-xs font-bold text-gray-400 mb-6 uppercase tracking-wide">Duration</label>
                <Timer className={`text-pink-400 mx-auto mb-4 ${deadHangActive ? 'animate-pulse' : ''}`} size={48} />
                <p className="text-5xl font-mono text-pink-600 mb-4">{formatTimeMs(deadHangMs)}</p>

                <div className="flex gap-3">
                  <button
                    onClick={togglePauseDeadHang}
                    disabled={!deadHangActive && !deadHangPaused}
                    className={`flex-1 bg-gray-200 rounded-xl p-3 text-gray-700 font-semibold ${(!deadHangActive && !deadHangPaused) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {deadHangActive ? 'Pause' : (deadHangPaused ? 'Resume' : 'Pause')}
                  </button>

                  <button
                    onClick={() => (deadHangActive || deadHangPaused) ? stopDeadHang() : startDeadHang()}
                    className="flex-1 bg-pink-500 text-white rounded-xl p-3 font-semibold"
                  >
                    {(deadHangActive || deadHangPaused) ? 'Stop & Log Set' : 'Start'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className={`${exercise.bodyweight ? '' : 'grid grid-cols-2 gap-6'} mb-6`}>
                  {!exercise.bodyweight && (
                    <div className="flex flex-col items-center">
                      <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wide">Weight (lbs)</label>
                      <div className="flex items-center gap-1 max-w-[140px]">
                        <button
                          onClick={() => setWeight(w => Math.max(0, (parseFloat(w) || 0) - 5).toString())}
                          className="bg-pink-100 hover:bg-pink-200 rounded-lg w-8 h-10 flex items-center justify-center active:scale-95 transition-all shrink-0"
                        >
                          <Minus size={16} className="text-pink-600" />
                        </button>
                        <input
                          type="number"
                          value={weight}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (val >= 0 || e.target.value === '') {
                              setWeight(e.target.value);
                            }
                          }}
                          min="0"
                          step="2.5"
                          className="w-full h-10 border-2 border-pink-100 rounded-lg text-center text-lg font-bold text-gray-800 focus:border-pink-400 outline-none"
                          placeholder="0"
                        />
                        <button
                          onClick={() => setWeight(w => ((parseFloat(w) || 0) + 5).toString())}
                          className="bg-pink-100 hover:bg-pink-200 rounded-lg w-8 h-10 flex items-center justify-center active:scale-95 transition-all shrink-0"
                        >
                          <Plus size={16} className="text-pink-600" />
                        </button>
                      </div>
                    </div>
                  )}
                  <div className={`flex flex-col items-center ${exercise.bodyweight ? 'w-full' : ''}`}>
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wide">
                      {exercise.bodyweight ? 'Total Reps (AMRAP)' : 'Reps'}
                    </label>
                    <div className={`flex items-center gap-1 relative ${exercise.bodyweight ? 'max-w-[200px]' : 'max-w-[140px]'}`}>
                      <button
                        onClick={() => setReps(r => Math.max(0, (parseInt(r) || 0) - 1).toString())}
                        className="bg-pink-100 hover:bg-pink-200 rounded-lg w-8 h-10 flex items-center justify-center active:scale-95 transition-all shrink-0"
                      >
                        <Minus size={16} className="text-pink-600" />
                      </button>
                      <input
                        type="number"
                        value={reps}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (val >= 0 || e.target.value === '') {
                            setReps(e.target.value);
                          }
                        }}
                        min="0"
                        className={`w-full h-10 border-2 border-pink-100 rounded-lg text-center text-lg font-bold focus:border-pink-400 outline-none ${!exercise.bodyweight ? getRepRangeColor(reps, exercise.repRange) : 'text-pink-600'}`}
                        placeholder="0"
                      />
                      <button
                        onClick={() => setReps(r => ((parseInt(r) || 0) + 1).toString())}
                        className="bg-pink-100 hover:bg-pink-200 rounded-lg w-8 h-10 flex items-center justify-center active:scale-95 transition-all shrink-0"
                      >
                        <Plus size={16} className="text-pink-600" />
                      </button>

                      {/* Smart Tips - Centered relative to the + button */}
                      {!exercise.bodyweight && (
                        <>
                          {shouldShowWeightIncreaseTip(reps, exercise.repRange) && (
                            <div className="absolute -top-12 right-0 bg-orange-500 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-50 animate-bounce">
                              Too easy? Consider adding weight ⬆️
                              <div className="absolute -bottom-1 right-2 w-2 h-2 bg-orange-500 rotate-45"></div>
                            </div>
                          )}
                          {shouldShowWeightDecreaseTip(reps, exercise.repRange) && (
                            <div className="absolute -top-12 right-0 bg-blue-500 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-50 animate-bounce">
                              Too hard? Consider lowering weight ⬇️
                              <div className="absolute -bottom-1 right-2 w-2 h-2 bg-blue-500 rotate-45"></div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={logSet}
                  disabled={(!exercise.bodyweight && !weight) || !reps}
                  className="w-full bg-pink-500 text-white rounded-xl p-4 font-bold text-lg shadow-lg hover:bg-pink-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={24} strokeWidth={3} />
                  Log Set
                </button>
              </>
            )}
          </div>

          {/* Simple Affirmation Text */}
          <div className="text-center px-4 py-2">
            <p className="text-pink-400 font-medium text-sm">{encouragement}</p>
          </div>

          {/* Notes Editor Modal */}
          {showNotesEditor && currentNoteExercise && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
                <h3 className="text-xl font-bold text-gray-800 mb-3">Notes for {currentNoteExercise}</h3>
                <p className="text-xs text-gray-500 mb-3">Form cues, seat settings, feet placement or general notes</p>
                <textarea
                  value={exerciseNotes[currentNoteExercise] || ''}
                  onChange={(e) => setExerciseNotes({ ...exerciseNotes, [currentNoteExercise]: e.target.value })}
                  placeholder="Add your notes here..."
                  className="w-full h-32 p-3 border-2 border-gray-200 rounded-lg focus:border-blue-400 outline-none text-sm resize-none"
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => {
                      setShowNotesEditor(false);
                      setCurrentNoteExercise(null);
                    }}
                    className="flex-1 bg-gray-200 rounded-xl p-3 text-gray-700 font-semibold active:scale-95 transition-all"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === 'trophy') {
    const bests = getTrophyData();
    const sortedExercises = Object.keys(bests).sort();

    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 font-sans">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => setScreen('home')}
            className="mb-4 text-pink-600 flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="text-center mb-6">
            <Trophy className="text-yellow-400 mx-auto mb-2" size={48} />
            <h2 className="text-2xl font-bold text-pink-600">Trophy Room</h2>
            <p className="text-pink-400 text-sm">Your personal bests! 🌟</p>
          </div>

          <div className="space-y-3">
            {sortedExercises.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-gray-500">
                <p>No records yet! Start a workout to set some PRs. 💪</p>
              </div>
            ) : (
              sortedExercises.map(name => {
                const record = bests[name];
                return (
                  <div key={name} className="bg-white rounded-xl p-4 shadow-md flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-gray-700">{name}</h3>
                      <p className="text-xs text-gray-400">{new Date(record.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      {record.weight > 0 ? (
                        <div className="text-xl font-bold text-pink-600">
                          {record.weight}<span className="text-sm font-normal text-gray-500">lbs</span>
                        </div>
                      ) : (
                        <div className="text-xl font-bold text-pink-600">
                          {record.reps}<span className="text-sm font-normal text-gray-500">reps</span>
                        </div>
                      )}
                      {record.weight > 0 && (
                        <div className="text-xs text-gray-400">x {record.reps} reps</div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    )
  }

  if (screen === 'history') {
    const calendarDays = getCalendarDays();
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];

    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 font-sans">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => {
              setScreen('home');
              setSelectedHistoryDate(null);
            }}
            className="mb-4 text-pink-600 flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 bg-white rounded-lg shadow hover:shadow-md transition-all active:scale-95"
            >
              <ChevronLeft size={20} className="text-pink-600" />
            </button>
            <h2 className="text-xl font-bold text-pink-600">{monthNames[calendarMonth]} {calendarYear}</h2>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 bg-white rounded-lg shadow hover:shadow-md transition-all active:scale-95"
            >
              <ChevronRight size={20} className="text-pink-600" />
            </button>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-lg mb-4">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="text-center text-xs font-semibold text-gray-500 uppercase">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((date, idx) => {
                if (!date) {
                  return <div key={idx} className="aspect-square"></div>;
                }

                const workout = getWorkoutForDate(date);
                const isToday = date.toDateString() === new Date().toDateString();
                const isSelected = selectedHistoryDate && date.toDateString() === selectedHistoryDate.toDateString();
                const isBirthday = date.getDate() === 17 && date.getMonth() === 11; // Dec 17

                const dayClass = workout
                  ? (workout.workout === 'rest'
                    ? (isSelected ? 'bg-blue-600 text-white shadow-md scale-105' : 'bg-blue-100 text-blue-700 hover:bg-blue-200')
                    : (workout.workout === 'hotYoga'
                      ? (isSelected ? 'bg-orange-600 text-white shadow-md scale-105' : 'bg-orange-100 text-orange-700 hover:bg-orange-200')
                      : (workout.workout === 'custom'
                        ? (isSelected ? 'bg-green-600 text-white shadow-md scale-105' : 'bg-green-50 text-green-700 hover:bg-green-100')
                        : (isSelected ? 'bg-pink-600 text-white shadow-md scale-105' : 'bg-pink-400 text-white hover:bg-pink-500')
                      )
                    )
                  )
                  : 'bg-gray-50 text-gray-400';

                return (
                  <button
                    key={idx}
                    onClick={() => workout && setSelectedHistoryDate(date)}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all relative ${dayClass} ${isToday ? 'ring-2 ring-offset-2 ring-pink-400' : ''} ${isBirthday ? 'ring-2 ring-yellow-300 bg-yellow-50' : ''}`}
                  >
                    {isBirthday && !workout ? <span className="text-lg">🎂</span> : (
                      <>
                        <div className="font-bold text-sm">{date.getDate()}</div>
                        {workout && (
                          <div className="text-lg leading-none mt-0.5">
                            {workout.workout === 'rest' ? '✨' : '⭐'}
                          </div>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedHistoryDate && getWorkoutForDate(selectedHistoryDate) && (
            <div className="bg-white rounded-2xl p-4 shadow-lg animate-in slide-in-from-bottom-4">
              <div className="flex justify-between items-start mb-3 border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">
                    {(() => {
                      const workout = getWorkoutForDate(selectedHistoryDate)!;
                      if (workout.workout === 'rest') return 'Rest Day';
                      if (workout.workout === 'hotYoga') return 'Hot Yoga';
                      if (workout.workout === 'custom') return 'Custom Workout';
                      return WORKOUTS[workout.workout]?.name || 'Workout';
                    })()}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedHistoryDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  {/* show cardio if present */}
                  {getWorkoutForDate(selectedHistoryDate)!.preWorkoutCardio && (
                    <p className="text-xs text-gray-500 mt-1">Cardio: <span className="font-medium text-gray-700">{getWorkoutForDate(selectedHistoryDate)!.preWorkoutCardio}</span></p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button
                    onClick={() => setSelectedHistoryDate(null)}
                    className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-50 rounded-full transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {getWorkoutForDate(selectedHistoryDate)!.exercises.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {(() => {
                      const workout = getWorkoutForDate(selectedHistoryDate)!;
                      if (workout.workout === 'rest') return 'Rest day - no exercises logged';
                      if (workout.workout === 'hotYoga') return 'Hot yoga - no exercises logged';
                      if (workout.workout === 'custom' && workout.customPlan) {
                        return `Custom: ${workout.customPlan}`;
                      }
                      return 'No exercises logged';
                    })()}
                  </p>
                ) : (
                  (() => {
                    const workout = getWorkoutForDate(selectedHistoryDate)!;
                    // group sets by exercise name
                    const grouped: Record<string, typeof workout.exercises> = {};
                    workout.exercises.forEach((s) => {
                      if (!grouped[s.exercise]) grouped[s.exercise] = [];
                      grouped[s.exercise].push(s as any);
                    });

                    return Object.entries(grouped).map(([name, sets]) => (
                      <div key={name} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                        <div className="flex justify-between items-center text-sm p-2 rounded hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setExpandedExercises(prev => ({ ...prev, [name]: !prev[name] }))}
                              className="text-xs text-gray-400 p-1 rounded hover:bg-gray-100"
                            >
                              {expandedExercises[name] === false ? '▸' : '▾'}
                            </button>
                            <div>
                              <div className="font-medium text-gray-700">{name}</div>
                              <div className="text-xs text-gray-500">{sets.length} set{sets.length > 1 ? 's' : ''}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                // open edit dialog for independent exercise notes
                                setEditHistoryExercise(name);
                                setEditHistoryNoteText(exerciseNotes[name] || '');
                                setShowEditHistoryNote(true);
                              }}
                              className="text-sm text-indigo-600 hover:underline"
                            >
                              Edit Notes
                            </button>
                          </div>
                        </div>
                        {/* show independent exercise note if present */}
                        {exerciseNotes[name] && (
                          <div className="text-xs text-gray-500 p-2 bg-blue-50 rounded mt-1 ml-2 mb-2 flex items-center gap-2">
                            <PenTool size={14} className="text-blue-600 shrink-0" />
                            <span>{exerciseNotes[name]}</span>
                          </div>
                        )}
                        <div className={`mt-2 space-y-1 transition-all overflow-hidden ${expandedExercises[name] === false ? 'max-h-0' : 'max-h-96'}`}>
                          {sets.map((ex, i) => (
                            <div key={i} className="p-1 ml-2 rounded text-xs text-gray-600 font-mono">
                              {ex.durationSeconds ? formatTimeMs(Math.round(ex.durationSeconds * 1000)) : `${ex.weight > 0 ? `${ex.weight}lb × ` : ''}${ex.reps}`}
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()
                )}
              </div>
            </div>
          )}

          {showDeleteConfirm && selectedHistoryDate && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
                <h3 className="text-xl font-bold text-gray-800 mb-3">Delete Workout?</h3>
                <p className="text-gray-600 mb-6">This action cannot be undone.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 bg-gray-200 rounded-xl p-3 text-gray-700 font-semibold active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteWorkout(selectedHistoryDate)}
                    className="flex-1 bg-red-500 text-white rounded-xl p-3 font-semibold active:scale-95 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {showEditHistoryNote && editHistoryExercise && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
                <h3 className="text-xl font-bold text-gray-800 mb-3">Edit notes for {editHistoryExercise}</h3>
                <p className="text-xs text-gray-500 mb-3">This note applies to all workouts with this exercise.</p>
                <textarea
                  value={editHistoryNoteText}
                  onChange={(e) => setEditHistoryNoteText(e.target.value)}
                  placeholder="Add or edit notes..."
                  className="w-full h-28 p-3 border-2 border-gray-200 rounded-lg focus:border-indigo-400 outline-none text-sm resize-none"
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => {
                      setShowEditHistoryNote(false);
                      setEditHistoryExercise(null);
                      setEditHistoryNoteText('');
                    }}
                    className="flex-1 bg-gray-200 rounded-xl p-3 text-gray-700 font-semibold active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!editHistoryExercise) return;
                      // save to independent exerciseNotes (applies to all workouts with this exercise)
                      setExerciseNotes(prev => ({
                        ...prev,
                        [editHistoryExercise]: editHistoryNoteText
                      }));
                      setShowEditHistoryNote(false);
                      setEditHistoryExercise(null);
                      setEditHistoryNoteText('');
                    }}
                    className="flex-1 bg-indigo-600 text-white rounded-xl p-3 font-semibold active:scale-95 transition-all"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === 'export') {
    const handleDownload = async () => {
      const fileName = `bekah-builder-backup-${new Date().toISOString().split('T')[0]}.gz`;
      const jsonData = exportData();
      
      // Compress data using gzip (native browser API)
      const encoder = new TextEncoder();
      const data = encoder.encode(jsonData);
      const compressionStream = new CompressionStream('gzip');
      const writer = compressionStream.writable.getWriter();
      writer.write(data);
      writer.close();
      
      const compressedBlob = await new Response(compressionStream.readable).blob();
      
      // Try Web Share API first (works great on iOS)
      if (navigator.share && navigator.canShare) {
        try {
          const file = new File([compressedBlob], fileName, { type: 'application/gzip' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file]
              // Note: Don't include 'title' or 'text' - iOS creates separate files from these
            });
            return;
          }
        } catch (err) {
          // User cancelled the share sheet - don't show fallback
          if (err instanceof Error && err.name === 'AbortError') {
            console.log('Share cancelled by user');
            return;
          }
          // Only fall through to download on actual errors
          console.log('Share failed, falling back to download:', err);
        }
      }
      
      // Fallback to traditional download (only for non-share-capable browsers)
      const element = document.createElement('a');
      element.href = URL.createObjectURL(compressedBlob);
      element.download = fileName;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(element.href);
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      
      // Detect file type by extension (iOS doesn't always provide correct MIME types)
      const isJson = file.name.endsWith('.json');
      const isGz = file.name.endsWith('.gz');
      
      // Handle legacy .json files
      if (isJson) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImportText(e.target?.result as string);
        };
        reader.readAsText(file);
        return;
      }
      
      // Handle compressed .gz files
      if (isGz) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          
          // Check if file is actually gzipped by looking at magic bytes
          const uint8 = new Uint8Array(arrayBuffer);
          const isGzipped = uint8[0] === 0x1f && uint8[1] === 0x8b;
          
          if (!isGzipped) {
            alert('Invalid backup file format. Please select a valid .gz file.');
            return;
          }
          
          const decompressionStream = new DecompressionStream('gzip');
          const writer = decompressionStream.writable.getWriter();
          writer.write(uint8);
          writer.close();
          
          const decompressedBlob = await new Response(decompressionStream.readable).blob();
          const text = await decompressedBlob.text();
          setImportText(text);
        } catch (err) {
          console.error('Decompression failed:', err);
          alert('Failed to decompress backup file. Please make sure it\'s a valid .gz backup file.');
        }
        return;
      }
      
      // Unknown file type
      alert('Please select a .gz or .json backup file.');
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 font-sans">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => setScreen('home')}
            className="mb-4 text-pink-600 flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <h2 className="text-2xl font-bold text-pink-600 mb-4">Data Management</h2>

          <div className="space-y-6">
            {/* Export Section */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Download size={20} className="text-pink-500" />
                Export Data
              </h3>
              <p className="text-sm text-gray-600 mb-4">Save your workout history and progress.</p>
              <button
                onClick={handleDownload}
                className="w-full bg-pink-500 text-white font-semibold py-3 rounded-lg hover:bg-pink-600 transition-colors active:scale-95"
              >
                Save Backup
              </button>
            </div>

            {/* Import Section */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Upload size={20} className="text-blue-500" />
                Import Data
              </h3>
              <p className="text-sm text-gray-600 mb-4">Restore your workout history from a backup file.</p>
              <div className="mb-4">
                <input
                  type="file"
                  accept=".gz,.json,application/gzip,application/x-gzip,application/json"
                  onChange={handleFileUpload}
                  className="w-full border-2 border-dashed border-blue-200 rounded-lg p-4 cursor-pointer hover:border-blue-400 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <button
                onClick={importData}
                disabled={!importText}
                className="w-full bg-blue-500 text-white font-semibold py-3 rounded-lg hover:bg-blue-600 transition-colors active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Restore History
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'shop') {
    const starPoints = calculateStarPoints();

    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 font-sans">
        {confetti.map(c => (
          <div
            key={c.id}
            className="confetti"
            style={{
              backgroundColor: c.color,
              left: c.left,
              animationDuration: c.animationDuration,
              animationDelay: c.delay
            }}
          />
        ))}
        <div className="max-w-md mx-auto">
          <button
            onClick={() => setScreen('home')}
            className="mb-4 text-pink-600 flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="text-center mb-6">
            <Gift className="text-purple-400 mx-auto mb-2" size={48} />
            <h2 className="text-2xl font-bold text-pink-600">Reward Shop</h2>
            <div className="mt-4 flex gap-3 justify-center items-center">
              <div className="bg-white rounded-lg px-3 py-2 shadow-md inline-flex items-center gap-2">
                <span className="text-2xl">⭐</span>
                <div className="text-left">
                  <div className="text-xs text-gray-500">Gold</div>
                  <div className="font-bold text-yellow-500">{stars.gold}</div>
                </div>
              </div>
              <div className="bg-white rounded-lg px-3 py-2 shadow-md inline-flex items-center gap-2">
                <span className="text-2xl">✨</span>
                <div className="text-left">
                  <div className="text-xs text-gray-500">Silver</div>
                  <div className="font-bold text-gray-400">{stars.silver}</div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-md inline-block">
                <p className="text-sm text-gray-600">Your Points: <span className="font-bold text-blue-500 text-lg">{starPoints}</span></p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {REWARDS.slice().sort((a, b) => a.cost - b.cost).map(reward => (
              <button
                key={reward.id}
                onClick={() => purchaseReward(reward)}
                className={`w-full rounded-xl p-4 shadow-md text-left transition-all active:scale-95 ${starPoints >= reward.cost
                  ? 'bg-white hover:shadow-lg cursor-pointer'
                  : 'bg-gray-100 opacity-60 cursor-not-allowed'
                  }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-800">{reward.name}</h3>
                  <span className={`text-sm font-bold px-2 py-1 rounded ${starPoints >= reward.cost
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-200 text-gray-500'
                    }`}>
                    {reward.cost} pts
                  </span>
                </div>
                <p className="text-sm text-gray-600">{reward.description}</p>
                {starPoints < reward.cost && (
                  <p className="text-xs text-red-500 mt-2">Need {reward.cost - starPoints} more points</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Reward Purchase Screen */}
        {showRewardPurchaseScreen && purchasedReward && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-auto">
            <style>{styles}</style>
            {confetti.map(c => (
              <div
                key={c.id}
                className="confetti"
                style={{
                  backgroundColor: c.color,
                  left: c.left,
                  animationDuration: c.animationDuration,
                  animationDelay: c.delay
                }}
              />
            ))}
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-xl text-center my-auto">
              <div className="text-7xl mb-4 animate-bounce">🎉</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Reward Redeemed!</h3>
              <p className="text-3xl mb-4">{purchasedReward.name}</p>
              <p className="text-gray-600 mb-2">{purchasedReward.description}</p>
              <p className="text-xs text-gray-400 mb-6">{new Date().toLocaleDateString()} at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="text-sm text-gray-500 mb-6">Take a screenshot to save this!</p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRewardPurchaseScreen(false);
                    setPurchasedReward(null);
                    setConfetti([]);
                  }}
                  className="flex-1 bg-pink-500 text-white rounded-xl p-3 font-semibold active:scale-95 transition-all hover:bg-pink-600"
                >
                  Back to Shop
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}