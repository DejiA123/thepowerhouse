import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import {
    Music,
    Mic,
    PlayCircle,
    ListMusic,
    FileMusic,
    Video,
    BookOpen,
    Users,
    Calendar,
    ArrowLeft,
    Download,
    Folder,
    Plus,
    MoreVertical,
    Trash2,
    FolderOpen,
    Heart,
    Pencil,
    Edit3,
    CalendarIcon,
    Zap,
    Waves,
    PlusCircle,
    Clock
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { choirService, ChoirFolder, WeeklySetSong, ChoirCalendarEvent } from "@/services/choirService";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// --- Sub-components ---
const BandSongCard = ({ song, allLibrarySongs, onUpdate }: { song: WeeklySetSong, allLibrarySongs: any[], onUpdate: (id: string, updates: any) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [notes, setNotes] = useState(song.instrumental_notes || "");
    const [chartUrl, setChartUrl] = useState(song.instrumental_url || "");

    // Sync state if props change (important for real-time updates)
    useEffect(() => {
        setNotes(song.instrumental_notes || "");
        setChartUrl(song.instrumental_url || "");
    }, [song.instrumental_notes, song.instrumental_url]);

    // Find the original library song to get fallback notes
    const librarySong = allLibrarySongs.find(s =>
        (song.library_song_id && s.id === song.library_song_id) ||
        (s.title.toLowerCase() === song.title.toLowerCase() && s.artist?.toLowerCase() === song.artist?.toLowerCase())
    );

    const displayNotes = song.instrumental_notes || (librarySong?.notes ? `[FROM LIBRARY] ${librarySong.notes}` : null);

    const handleSave = () => {
        onUpdate(song.id, { instrumental_notes: notes, instrumental_url: chartUrl });
        setIsEditing(false);
    };

    return (
        <div className="bg-white dark:bg-slate-700/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 font-bold shrink-0 text-xs">
                        {song.key}
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100">{song.title}</h4>
                        <p className="text-xs text-slate-500">{song.artist}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {song.instrumental_url && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                            onClick={() => window.open(song.instrumental_url, '_blank')}
                        >
                            <FileMusic className="w-3 h-3" /> View Chart
                        </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setIsEditing(!isEditing)}>
                        <Pencil className="w-3 h-3 text-slate-400" />
                    </Button>
                </div>
            </div>

            {isEditing ? (
                <div className="space-y-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <div>
                        <Label className="text-[10px] uppercase text-slate-400 font-bold">Band Notes (Chords, Dynamics)</Label>
                        <Textarea
                            placeholder="e.g. Intro: G - C - D. Soft start, builds at bridge."
                            className="text-sm mt-1 min-h-[80px]"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label className="text-[10px] uppercase text-slate-400 font-bold">Chart URL (Google Drive/PDF)</Label>
                        <Input
                            placeholder="https://drive.google.com/..."
                            className="text-sm mt-1"
                            value={chartUrl}
                            onChange={e => setChartUrl(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave}>Save Details</Button>
                    </div>
                </div>
            ) : (
                <>
                    {displayNotes ? (
                        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-800">
                            <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                                <strong className="text-slate-400 uppercase text-[10px] block mb-1">Band Notes:</strong>
                                {displayNotes}
                            </p>
                        </div>
                    ) : (
                        <p className="text-[10px] text-slate-400 italic mt-2">No specific band instructions yet.</p>
                    )}
                </>
            )}
        </div>
    );
};

const AcademyCourseCard = ({ course, onAccess }: { course: any, onAccess: (course: any) => void }) => {
    return (
        <Card className="group overflow-hidden border-none shadow-xl bg-white dark:bg-slate-800 hover:shadow-2xl transition-all duration-500 rounded-[2rem]">
            <div className="relative h-48 overflow-hidden">
                <img
                    src={course.image}
                    alt={course.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                <Badge className="absolute top-4 left-4 bg-white/20 backdrop-blur-md text-white border-white/30 text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full">
                    {course.category}
                </Badge>
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center text-white">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                        <Clock className="w-3 h-3" />
                        {course.duration}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                        <Zap className="w-3 h-3 text-amber-400" />
                        {course.level}
                    </div>
                </div>
            </div>
            <CardContent className="p-6">
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2 leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                    {course.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-6 font-medium leading-relaxed italic">
                    {course.description}
                </p>
                <Button
                    className="w-full bg-slate-900 hover:bg-blue-600 text-white dark:bg-slate-700 dark:hover:bg-blue-600 py-6 h-auto rounded-2xl shadow-lg transition-all duration-300 font-bold group-hover:translate-y-[-2px]"
                    onClick={() => onAccess(course)}
                >
                    Access Course <PlayCircle className="w-4 h-4 ml-2" />
                </Button>
            </CardContent>
        </Card>
    );
};

const ChoirPage = () => {
    const academyCourses = useMemo(() => [
        {
            title: "Vocal Mastery",
            icon: <Mic className="w-6 h-6" />,
            description: "Refining the voice as a sacred instrument of worship.",
            courses: [
                {
                    id: "vocal-101",
                    title: "Vocal Lessons 101",
                    category: "Foundations",
                    duration: "4.5 Hours",
                    level: "Beginner",
                    description: "Master breath control, posture, and resonance to build a healthy vocal foundation.",
                    image: "/assets/academy/vocal_lessons_101.png",
                    modules: [
                        {
                            title: "Diaphragmatic Breathing Mastery",
                            content: "The foundation of all great singing is the breath. Diaphragmatic breathing involves engaging the transverse abdominis and the diaphragm to create a stable column of air. Practice the 'Siss' exercise: inhale for 4 counts, exhale on a steady 'S' sound for 16, 24, then 32 counts to build lung capacity and air management precision.",
                            audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
                            exercises: [
                                {
                                    type: "breath-timer",
                                    title: "Siss Exercise Timer",
                                    instructions: "Follow the visual timer: Inhale for 4 counts, then exhale on 'S' sound",
                                    durations: [16, 24, 32]
                                }
                            ]
                        },
                        {
                            title: "Postural Alignment (Alexander Technique)",
                            content: "Your body is your instrument. Alignment between the head, neck, and spine is critical. Ensure your chin is parallel to the ground, shoulders are relaxed (not rolled forward), and your chest is naturally 'noble' (expanded but not forced). This reduces tension in the extrinsic laryngeal muscles, allowing for free vocal fold vibration.",
                            exercises: [
                                {
                                    type: "posture-check",
                                    title: "Alignment Self-Assessment",
                                    instructions: "Stand in front of a mirror and check: chin parallel, shoulders relaxed, chest naturally expanded",
                                    checkpoints: ["Chin Position", "Shoulder Relaxation", "Chest Expansion"]
                                }
                            ]
                        },
                        {
                            title: "The Mechanics of Resonance",
                            content: "Learn to shape your vowels (A, E, I, O, U) for maximum acoustic efficiency. By lifting the soft palate and positioning the tongue correctly, you create space in the pharynx (the 'singer's formant'), allowing your voice to cut through a band without shouting.",
                            audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
                            exercises: [
                                {
                                    type: "vowel-practice",
                                    title: "Vowel Shaping Exercise",
                                    instructions: "Sing each vowel (A-E-I-O-U) on a comfortable pitch, focusing on soft palate lift",
                                    vowels: ["A", "E", "I", "O", "U"]
                                }
                            ]
                        }
                    ]
                },
                {
                    id: "vocal-pro",
                    title: "Professional Vocal Training",
                    category: "Technique",
                    duration: "6 Hours",
                    level: "Intermediate",
                    description: "Advanced exercises for agility, range expansion, and pitch precision.",
                    image: "/assets/academy/professional_vocal_training.png",
                    modules: [
                        {
                            title: "Mixed Voice & Bridge Navigation",
                            content: "Mastering the transition between chest voice and head voice (the 'passaggio') is what defines a pro. Learn to use the 'cry' or 'ng' placement to thin out the vocal folds as you move higher, creating a seamless, powerful 'mixed' sound that is safe and resonant.",
                            audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
                            exercises: [
                                {
                                    type: "pitch-glide",
                                    title: "Passaggio Transition Practice",
                                    instructions: "Slowly glide from chest voice to head voice on 'ng' sound, focusing on smooth transition",
                                    startNote: "C3",
                                    endNote: "C5"
                                }
                            ]
                        },
                        {
                            title: "Vocal Agility: Runs and Riffs",
                            content: "Agility requires localized muscle control. Practice the pentatonic and blues scales at slow tempos (60 BPM), focusing on hitting every note with individual clarity (staccato) before smoothing them into rapid 'runs' (legato). Precision over speed is the professional standard.",
                            exercises: [
                                {
                                    type: "scale-practice",
                                    title: "Pentatonic Scale Drill",
                                    instructions: "Practice the pentatonic scale at 60 BPM. Start staccato, then move to legato",
                                    scale: "Pentatonic",
                                    tempo: 60,
                                    variations: ["Staccato", "Legato"]
                                },
                                {
                                    type: "metronome",
                                    title: "Interactive Metronome",
                                    instructions: "Practice with adjustable tempo from 40-120 BPM",
                                    tempoRange: [40, 120]
                                }
                            ]
                        },
                        {
                            title: "Performance Stamina & Health",
                            content: "Professional training includes voice preservation. Learn about vocal hygiene (hydration, rest, and avoiding irritants) and 'cool-down' exercises like the 'lip trill' or straw phonation to reset the vocal folds after a high-intensity service."
                        }
                    ]
                },
                {
                    id: "vocal-harmony",
                    title: "Vocal Harmony & Blending",
                    category: "Performance",
                    duration: "3.5 Hours",
                    level: "All Levels",
                    description: "Learn the art of ear training to create seamless choral textures and perfect blend.",
                    image: "/assets/academy/vocal_harmony_blending_v2.jpg",
                    modules: [
                        {
                            title: "Interval Ear Training",
                            content: "Harmony is the distance between notes. Learn to identify and sing major thirds, perfect fifths, and dominant sevenths by ear. This allows you to 'find your part' instantly when a new song is introduced, even without sheet music."
                        },
                        {
                            title: "The Art of Vocal Blending",
                            content: "A choir should sound like 'one voice.' This requires matching vowel shapes and vibrato speeds with the singers around you. Practice 'vowel matching'—ensuring everyone's 'O' is equally tall and dark to create a thick, unified choral texture."
                        },
                        {
                            title: "Dynamic Sensitivity in Groups",
                            content: "Harmony is ineffective if it's not balanced. Learn 'The Pyramid of Sound'—where the lower parts (Basses/Tenors) provide a foundation for the higher parts (Altos/Sopranos). Learn to adjust your volume to serve the overall texture, not to stand out."
                        }
                    ]
                }
            ]
        },
        {
            title: "Ensemble & Unity",
            icon: <Users className="w-6 h-6" />,
            description: "Building a cohesive team that moves together in spiritual and technical sync.",
            courses: [
                {
                    id: "ensemble-unity",
                    title: "Singing in Unity",
                    category: "Spiritual",
                    duration: "2 Hours",
                    level: "Essential",
                    description: "Exploring the biblical foundation of corporate worship and ensemble dynamics.",
                    image: "/assets/academy/singing_in_unity.png",
                    modules: [
                        {
                            title: "The Theology of One Voice",
                            content: "Worship is not a solo performance; it is a corporate response to God's glory. Study Psalm 133 and the 'sound of many waters' in Revelation. Unity in the choir is a spiritual weapon that creates an atmosphere for the miraculous."
                        },
                        {
                            title: "Technical Sync: Attack & Release",
                            content: "Unity is heard in the precision of the group. Practice 'unison attacks' (starting the first vowel exactly together) and 'releases' (consonants finishing at the same microsecond). Use the 'Siss' technique to align the group's rhythmic heartbeat."
                        },
                        {
                            title: "The Horizontal Connection",
                            content: "Beyond the music, unity requires relationship. Learn how to maintain a heart of service toward your team. This module focuses on resolving conflict and supporting one another, which translates into a more powerful spiritual atmosphere on stage."
                        }
                    ]
                },
                {
                    id: "worship-leading",
                    title: "Worship Leading Excellence",
                    category: "Leadership",
                    duration: "5 Hours",
                    level: "Advanced",
                    description: "Guidance for leaders on song selection, flow, and congregation engagement.",
                    image: "/assets/academy/worship_leading_excellence.png",
                    modules: [
                        {
                            title: "Spiritual Authority & Preparation",
                            content: "A worship leader leads from a place of personal encounter. This module explores the importance of the 'Secret Place'—private worship that builds the authority needed to lead a public congregation. It's about 'being' before 'doing'."
                        },
                        {
                            title: "Crafting a Journey (The Flow)",
                            content: "Worship is a journey into the Holy of Holies. Learn to curate a setlist that moves through 'The Outer Courts' (Praise) into 'The Holy Place' (Intimacy). Master the art of spontaneous singing and instrumental 'selahs' to let the Spirit breathe."
                        },
                        {
                            title: "Congregational Engagement & Empathy",
                            content: "Leadership is about serving the people. Learn to read the room and provide clear, simple vertical directions. This includes 'pastoring the moment'—knowing when to push, when to wait, and how to use scripture to unlock the hearts of the congregation."
                        }
                    ]
                }
            ]
        },
        {
            title: "Instrumental Masterclasses",
            icon: <Music className="w-6 h-6" />,
            description: "Technical excellence for EVERY section of the band.",
            courses: [
                {
                    id: "piano-mastery",
                    title: "Worship Piano Mastery",
                    category: "Keys",
                    duration: "8 Hours",
                    level: "Inter/Adv",
                    description: "Chord voicings, pads, and rhythmic patterns for piano and keyboards.",
                    image: "https://images.unsplash.com/photo-1552422535-c45813c61732?q=80&w=2000&auto=format&fit=crop",
                    modules: [
                        {
                            title: "Modern Worship Voicings",
                            content: "Move beyond standard triads. Learn to use 'Add2', 'Sus4', and open-voiced '9ths' to create the lush, expansive sound found in modern worship music. This module covers 'Inversion Theory' to ensure smooth transitions between chords with minimal hand movement."
                        },
                        {
                            title: "Layering & Pad Integration",
                            content: "In a modern set, the piano often serves as a foundation for digital pads. Learn how to 'play to the pad'—using sparse, intentional note selection to avoid frequency clutter. Master the use of the sustain pedal for ambient 'wash' without losing rhythmic clarity."
                        },
                        {
                            title: "Rhythmic Flow & Syncopation",
                            content: "Worship piano is largely about 'propulsion.' Learn 8th-note and 16th-note rhythmic patterns that drive the song forward. This module includes syncopated 'diamond' patterns and how to build dynamics by moving from low-octave 'power' notes to high-register melodic fills."
                        }
                    ]
                },
                {
                    id: "modern-drumming",
                    title: "Modern Drumming & Rhythms",
                    category: "Drums",
                    duration: "7 Hours",
                    level: "All Levels",
                    description: "Timekeeping, dynamics, and click-track precision for the church stage.",
                    image: "https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?q=80&w=2000&auto=format&fit=crop",
                    modules: [
                        {
                            title: "Pocket Playing & Time Mastery",
                            content: "The drummer's primary role is 'The Clock.' Practice playing 'in the pocket'—slightly behind or exactly on the beat to create a sense of weight and stability. This module includes rigorous click-track exercises to ensure perfect timing even across tempo changes."
                        },
                        {
                            title: "Dynamic Gradation: The Build",
                            content: "Worship songs often follow a 'Crescendo Architecture.' Learn to master the 1-10 dynamic scale—from subtle cross-stick and shaker work to massive, 16th-note floor tom builds. Proper cymbal selection and 'wash technique' are also covered."
                        },
                        {
                            title: "Instrumental Narratives",
                            content: "A drummer 'pastors' the rhythm. Learn to use 'ghost notes' and fills that serve the lyric, not the ego. This module focuses on how to support a worship leader by listening for spiritual cues and providing the rhythmic energy they need."
                        }
                    ]
                },
                {
                    id: "guitar-electric",
                    title: "Guitar: Electric & Acoustic",
                    category: "Guitar",
                    duration: "6.5 Hours",
                    level: "Intermediate",
                    description: "Tone shaping, pedalboard management, and strumming patterns.",
                    image: "https://images.unsplash.com/photo-1525201548942-d8732f6617a0?q=80&w=2000&auto=format&fit=crop",
                    modules: [
                        {
                            title: "The Architecture of Tone",
                            content: "For electric guitarists, tone is an instrument in itself. Master the 'Gain Stage'—the interaction between overdrive, reverb, and delay. Learn to dial in the 'ambient wash' that provides the atmospheric bed for worship transitions."
                        },
                        {
                            title: "Acoustic Percussive Strumming",
                            content: "The acoustic guitar is the rhythmic glue of the band. Learn advanced percussive strumming techniques that emphasize the 2 and 4. This module covers 'Open Tuning and Capo Theory' to maximize resonance and harmonic richness."
                        },
                        {
                            title: "Lead Guitar: Melodic Narrative",
                            content: "Lead guitar in worship is about 'hooks' and 'swells.' Learn to use volume pedals for seamless swells and how to play melodic lines that echo the song's vocal melody without being repetitive."
                        }
                    ]
                },
                {
                    id: "bass-guitar",
                    title: "The Low End: Bass Guitar",
                    category: "Bass",
                    duration: "4 Hours",
                    level: "Beginner",
                    description: "Locking with the kick, groove theory, and fundamental scales.",
                    image: "/assets/academy/bass_guitar_mastery.png",
                    modules: [
                        {
                            title: "The Foundation: Kick and Bass",
                            content: "Unity begins in the low end. Learn the 'Kick-Bass Connection'—how to align your rhythmic accents 1:1 with the drummer's kick drum. This creates a solid 'foundation' that the rest of the band can build upon safely."
                        },
                        {
                            title: "Groove Theory & Harmonic Support",
                            content: "Bass is both rhythmic and melodic. Study how to use passing notes (non-chordal tones) to create some movement between root notes. Learn when to 'play the groove' and when to sit simply on the root for maximum impact."
                        },
                        {
                            title: "Active Listening & Frequency Space",
                            content: "A pro bass player knows how to 'leave space.' Learn to listen for the frequencies of the piano and electric guitar to ensure your notes have 'air' and clarity. This module includes basic EQ settings for a clean, punchy church tone."
                        }
                    ]
                },
                {
                    id: "saxophone-mastery",
                    title: "The Breath: Saxophone",
                    category: "Wind",
                    duration: "5.5 Hours",
                    level: "Intermediate",
                    description: "Phrasing, intonation, and improvisational skills for worship.",
                    image: "/assets/academy/saxophone_mastery_v2.jpg",
                    modules: [
                        {
                            title: "Phrasing & Breath Expression",
                            content: "The saxophone is the closest instrument to the human voice. Learn to 'sing through the horn' using intentional phrasing and breath support. This module covers the use of 'subtone' for intimate sections and 'altissimo' for climactic moments."
                        },
                        {
                            title: "Intonation & Harmonic Tuning",
                            content: "Wind instruments require constant adjustment. Develop your 'internal ear' to tune to the keyboard and band live. Practice playing with 'dead-on' intonation across the entire range of the instrument, especially in the high register."
                        },
                        {
                            title: "Spiritual Improvisation",
                            content: "Improvisation in worship is about 'prophetic echo.' Learn to take the vocal melody and expand it with tasteful riffs and fills that respond to the Spirit's flow. Focus on 'Pentatonic Mastery' and 'Blues Inflections' to add soul and depth to your play."
                        }
                    ]
                }
            ]
        }
    ], []);

    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
    const [completedModules, setCompletedModules] = useState<Set<string>>(new Set());
    const [currentAudio, setCurrentAudio] = useState<{ playing: boolean, url: string, speed: number } | null>(null);
    const [activeExercise, setActiveExercise] = useState<any>(null);
    const [metronomeBPM, setMetronomeBPM] = useState(60);
    const [metronomeActive, setMetronomeActive] = useState(false);
    const [breathTimerActive, setBreathTimerActive] = useState(false);
    const [breathPhase, setBreathPhase] = useState<'inhale' | 'exhale' | 'rest'>('rest');
    const [breathCount, setBreathCount] = useState(0);

    const handleAccessCourse = (course: any) => {
        toast.info(`Registering user for ${course.title}...`);
        setTimeout(() => {
            setSelectedCourse(course);
            setIsCourseModalOpen(true);
        }, 1000);
    };

    const handleNextLesson = () => {
        if (!selectedCourse) return;

        // Flatten all courses to find the next one
        const flatCourses = academyCourses.flatMap(section => section.courses);
        const currentIndex = flatCourses.findIndex(c => c.id === selectedCourse.id);

        if (currentIndex !== -1 && currentIndex < flatCourses.length - 1) {
            const nextCourse = flatCourses[currentIndex + 1];
            toast.success(`Loading next lesson: ${nextCourse.title}`);
            setSelectedCourse(nextCourse);

            // Scroll to top of modal
            const modalElement = document.getElementById('course-modal-content');
            if (modalElement) modalElement.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            toast.info("You've reached the end of the current curriculum track!");
        }
    };

    const navigate = useNavigate();
    const [searchParams] = useSearchParams(); // Added for deep linking
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("vocalists");
    const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // State for YouTube Player
    const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);

    // State for Setlist Date
    const [setlistDate, setSetlistDate] = useState<Date | undefined>(startOfWeek(new Date(), { weekStartsOn: 1 }));

    // State for Header Modals
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);
    const [isRosterOpen, setIsRosterOpen] = useState(false);

    // Dynamic Instrumental Resources from Supabase
    const [instrResources, setInstrResources] = useState<any[]>([]);

    // Calendar Events State
    const [calendarEvents, setCalendarEvents] = useState<ChoirCalendarEvent[]>([]);
    const [isAddEventOpen, setIsAddEventOpen] = useState(false);
    const [newEvent, setNewEvent] = useState({
        title: "",
        description: "",
        color: "purple"
    });
    const [editingEvent, setEditingEvent] = useState<ChoirCalendarEvent | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Data from Supabase
    const [folders, setFolders] = useState<ChoirFolder[]>([]);
    const [praiseSet, setPraiseSet] = useState<WeeklySetSong[]>([]);
    const [worshipSet, setWorshipSet] = useState<WeeklySetSong[]>([]);

    // Setlist Descriptions State
    const [praiseInfo, setPraiseInfo] = useState({ title: "Praise Set", desc: "" });
    const [worshipInfo, setWorshipInfo] = useState({ title: "Worship Set", desc: "" });

    // UI States for Edit Setlist Info
    const [isEditSetInfoOpen, setIsEditSetInfoOpen] = useState(false);
    const [editingSetInfoType, setEditingSetInfoType] = useState<'praise' | 'worship' | null>(null);
    const [tempSetInfo, setTempSetInfo] = useState({ title: "", desc: "" });

    // UI States for Folder/Song Management
    const [newFolderName, setNewFolderName] = useState("");
    const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
    const [isAddSongOpen, setIsAddSongOpen] = useState(false);
    const [newSong, setNewSong] = useState({ title: "", key: "", artist: "", url: "", notes: "" });

    // UI States for Edit Song (Library)
    const [isEditSongOpen, setIsEditSongOpen] = useState(false);
    const [editingSongId, setEditingSongId] = useState<string | null>(null);
    const [songToEdit, setSongToEdit] = useState({ title: "", key: "", artist: "", url: "", notes: "" });

    // UI States for Setlist Management
    const [isAddToSetOpen, setIsAddToSetOpen] = useState(false);
    const [activeSetType, setActiveSetType] = useState<'praise' | 'worship' | null>(null);
    const [newSetSong, setNewSetSong] = useState<{ title: string, key: string, artist: string, url: string, library_song_id?: string }>({
        title: "",
        key: "",
        artist: "",
        url: "",
        library_song_id: undefined
    });

    // UI States for Edit Setlist Song
    const [isEditSetSongOpen, setIsEditSetSongOpen] = useState(false);
    const [editingSetSongId, setEditingSetSongId] = useState<string | null>(null);
    const [editingSetlistSongData, setEditingSetlistSongData] = useState({
        title: "",
        key: "",
        artist: "",
        url: "",
        instrumental_url: "",
        instrumental_notes: ""
    });

    // UI States for Import Setlist
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [importText, setImportText] = useState("");
    const [importSetType, setImportSetType] = useState<'praise' | 'worship' | null>(null);

    // UI States for Import Folder Songs
    const [isImportFolderOpen, setIsImportFolderOpen] = useState(false);
    const [importFolderText, setImportFolderText] = useState("");

    // Unified YouTube ID extractor
    const extractYoutubeId = (url?: string) => {
        if (!url) return null;
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        const id = (match && match[7].length === 11) ? match[7] : null;

        if (id) return id;

        // Handle shorts
        if (url.includes('/shorts/')) {
            const parts = url.split('/shorts/');
            return parts[1]?.split(/[?&]/)[0];
        }

        return null;
    };

    // Resource Preview Helper (extracts YT thumbnail)
    const getYTThumbnail = (url?: string) => {
        const id = extractYoutubeId(url);
        if (id) return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
        return null;
    };

    // Instrumental Resource Management States
    const [isAddInstrOpen, setIsAddInstrOpen] = useState(false);
    const [isEditInstrOpen, setIsEditInstrOpen] = useState(false);
    const [editingInstrId, setEditingInstrId] = useState<string | null>(null);
    const [newInstr, setNewInstr] = useState({ title: "", type: "Tutorial", url: "" });
    const [instrToEdit, setInstrToEdit] = useState({ title: "", type: "Tutorial", url: "" });

    // Initial Data Fetch
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [fetchedFolders, fetchedPraise, fetchedWorship, fetchedInfo, fetchedInstr, fetchedEvents] = await Promise.all([
                    choirService.getFolders(),
                    choirService.getWeeklySetlist('praise'),
                    choirService.getWeeklySetlist('worship'),
                    choirService.getAllSetlistInfo(),
                    choirService.getInstrumentalResources(),
                    choirService.getCalendarEvents()
                ]);

                setFolders(fetchedFolders as any);
                setPraiseSet(fetchedPraise as any);
                setWorshipSet(fetchedWorship as any);
                setInstrResources(fetchedInstr);
                setCalendarEvents(fetchedEvents);

                console.log("Choir Data Loaded:", {
                    folders: fetchedFolders,
                    songsTotal: fetchedFolders.reduce((acc, f) => acc + (f.songs?.length || 0), 0),
                    folderDetails: fetchedFolders.map(f => ({ name: f.name, songCount: f.songs?.length || 0, songs: f.songs }))
                });

                if (fetchedInfo['date']) {
                    const dbDate = new Date(fetchedInfo['date']);
                    const currentMonday = startOfWeek(new Date(), { weekStartsOn: 1 });

                    // 🚨 NEW WEEK DETECTION
                    if (currentMonday.getTime() > startOfWeek(dbDate, { weekStartsOn: 1 }).getTime()) {
                        console.log("New week detected! Clearing setlists...");
                        await choirService.clearWeeklySetlist();
                        await choirService.updateSetlistInfo('date', currentMonday.toISOString());
                        setSetlistDate(currentMonday);
                        setPraiseSet([]);
                        setWorshipSet([]);
                    } else {
                        setSetlistDate(dbDate);
                    }
                }
                if (fetchedInfo['praise_desc']) setPraiseInfo(prev => ({ ...prev, desc: fetchedInfo['praise_desc'] }));
                if (fetchedInfo['worship_desc']) setWorshipInfo(prev => ({ ...prev, desc: fetchedInfo['worship_desc'] }));

            } catch (error) {
                console.error("Error fetching choir data:", error);
                toast.error("Failed to load choir data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();

        // 🔄 Real-time date update: Check every minute if the week has changed
        const dateInterval = setInterval(async () => {
            const currentMonday = startOfWeek(new Date(), { weekStartsOn: 1 });

            setSetlistDate(prevDate => {
                if (!prevDate) return currentMonday;

                const prevMonday = startOfWeek(prevDate, { weekStartsOn: 1 });

                if (currentMonday.getTime() > prevMonday.getTime()) {
                    // Trigger async clearing in the background
                    (async () => {
                        console.log("Week transition detected in real-time! Clearing...");
                        await choirService.clearWeeklySetlist();
                        await choirService.updateSetlistInfo('date', currentMonday.toISOString());
                        setPraiseSet([]);
                        setWorshipSet([]);
                        toast.info("New week started: Setlists cleared.");
                    })();
                    return currentMonday;
                }
                return prevDate;
            });
        }, 60000);

        return () => clearInterval(dateInterval);
    }, []);

    // Sync state with URL params (Deep Linking)
    useEffect(() => {
        const folderId = searchParams.get('folderId');
        const tab = searchParams.get('tab');

        if (folderId) {
            setActiveFolderId(folderId);
            setActiveTab('vocalists');
        }

        if (tab) {
            if (tab === 'schedule') {
                setIsScheduleOpen(true);
            } else if (['vocalists', 'instrumentalists'].includes(tab)) {
                setActiveTab(tab);
            }
        }
    }, [searchParams]);

    // Refresh library when adding to setlist to ensure dropdown is fresh
    useEffect(() => {
        if (isAddToSetOpen) {
            const refreshLibrary = async () => {
                try {
                    const fetchedFolders = await choirService.getFolders();
                    setFolders(fetchedFolders as any);
                } catch (error) {
                    console.error("Error refreshing folders:", error);
                }
            };
            refreshLibrary();
        }
    }, [isAddToSetOpen]);


    // -- Handlers for Setlist Info --
    const openEditSetInfo = (type: 'praise' | 'worship') => {
        setEditingSetInfoType(type);
        const info = type === 'praise' ? praiseInfo : worshipInfo;
        setTempSetInfo({ ...info });
        setIsEditSetInfoOpen(true);
    };

    const saveSetInfo = async () => {
        if (!editingSetInfoType) return;
        try {
            const key = editingSetInfoType === 'praise' ? 'praise_desc' : 'worship_desc';
            await choirService.updateSetlistInfo(key, tempSetInfo.desc);

            if (editingSetInfoType === 'praise') {
                setPraiseInfo(prev => ({ ...prev, desc: tempSetInfo.desc }));
            } else {
                setWorshipInfo(prev => ({ ...prev, desc: tempSetInfo.desc }));
            }
            setIsEditSetInfoOpen(false);
            toast.success("Description updated");
        } catch (e) {
            console.error(e);
            toast.error("Failed to update description");
        }
    };

    // -- Handlers for Date --
    const handleDateSelect = async (date: Date | undefined) => {
        if (!date) return;
        try {
            const mondayOfSelectedWeek = startOfWeek(date, { weekStartsOn: 1 });
            setSetlistDate(mondayOfSelectedWeek);
            await choirService.updateSetlistInfo('date', mondayOfSelectedWeek.toISOString());
        } catch (e) {
            console.error(e);
            toast.error("Failed to save date");
        }
    };

    // -- Handlers for Folders --
    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            // If activeFolderId is set, this is a subfolder
            const newFolder = await choirService.createFolder(newFolderName, activeFolderId);
            setFolders([...folders, newFolder]);
            setNewFolderName("");
            setIsNewFolderOpen(false);
            toast.success(activeFolderId ? "Subfolder created" : "Folder created");
        } catch (e) {
            console.error(e);
            toast.error("Failed to create folder");
        }
    };

    const handleAddSong = async () => {
        if (!newSong.title.trim() || !activeFolderId) return;
        try {
            const addedSong = await choirService.addSongToFolder({
                folder_id: activeFolderId,
                title: newSong.title,
                key: newSong.key,
                artist: newSong.artist,
                url: newSong.url,
                notes: newSong.notes
            });

            setFolders(folders.map(f => {
                if (f.id === activeFolderId) {
                    return { ...f, songs: [...(f.songs || []), addedSong] };
                }
                return f;
            }) as any);

            setNewSong({ title: "", key: "", artist: "", url: "", notes: "" });
            setIsAddSongOpen(false);
            toast.success("Song added");
        } catch (e) {
            console.error(e);
            toast.error("Failed to add song");
        }
    };

    const deleteFolder = async (id: string) => {
        try {
            await choirService.deleteFolder(id);
            setFolders(folders.filter(f => f.id !== id));
            if (activeFolderId === id) setActiveFolderId(null);
            toast.success("Folder deleted");
        } catch (e) {
            console.error(e);
            toast.error("Failed to delete folder");
        }
    };

    // -- Handlers for Song Edit/Delete (Library) --
    const startEditSong = (song: any) => { // Type as any or Song from service
        setEditingSongId(song.id);
        setSongToEdit({
            title: song.title,
            key: song.key,
            artist: song.artist,
            url: song.url || "",
            notes: song.notes || ""
        });
        setIsEditSongOpen(true);
    };

    const handleSaveEditSong = async () => {
        if (!songToEdit.title.trim() || !activeFolderId || !editingSongId) return;

        try {
            const updatedSong = await choirService.updateSong(editingSongId, {
                title: songToEdit.title,
                key: songToEdit.key,
                artist: songToEdit.artist,
                url: songToEdit.url,
                notes: songToEdit.notes
            });

            setFolders(folders.map(f => {
                if (f.id === activeFolderId) {
                    return {
                        ...f,
                        songs: f.songs?.map(s => s.id === editingSongId ? updatedSong : s) || []
                    };
                }
                return f;
            }) as any);

            setIsEditSongOpen(false);
            setEditingSongId(null);
            toast.success("Song updated");
        } catch (e) {
            console.error(e);
            toast.error("Failed to update song");
        }
    };

    const handleDeleteSong = async (songId: string) => {
        if (!activeFolderId) return;
        try {
            await choirService.deleteSong(songId);
            setFolders(folders.map(f => {
                if (f.id === activeFolderId) {
                    return { ...f, songs: f.songs?.filter(s => s.id !== songId) || [] };
                }
                return f;
            }));
            toast.success("Song deleted");
        } catch (e) {
            console.error(e);
            toast.error("Failed to delete song");
        }
    };

    // -- Handlers for Setlists --
    const openAddSetSong = (type: 'praise' | 'worship') => {
        setActiveSetType(type);
        setNewSetSong({ title: "", key: "", artist: "", url: "" });
        setIsAddToSetOpen(true);
    };

    const handleAddSetSong = async () => {
        if (!newSetSong.title.trim() || !activeSetType) return;
        try {
            const addedSong = await choirService.addWeeklySong({
                set_type: activeSetType,
                title: newSetSong.title,
                key: newSetSong.key,
                artist: newSetSong.artist,
                url: newSetSong.url,
                library_song_id: newSetSong.library_song_id
            });

            if (activeSetType === 'praise') {
                setPraiseSet([...praiseSet, addedSong] as any);
            } else {
                setWorshipSet([...worshipSet, addedSong] as any);
            }

            setIsAddToSetOpen(false);
            toast.success("Song added to setlist");
        } catch (e) {
            console.error(e);
            toast.error("Failed to add song to setlist");
        }
    };

    const removeSetSong = async (type: 'praise' | 'worship', id: string) => {
        try {
            await choirService.deleteWeeklySong(id);
            if (type === 'praise') {
                setPraiseSet(praiseSet.filter(s => s.id !== id));
            } else {
                setWorshipSet(worshipSet.filter(s => s.id !== id));
            }
            toast.success("Song removed from setlist");
        } catch (e) {
            console.error(e);
            toast.error("Failed to remove song");
        }
    };

    // -- Handlers for Edit Setlist Song --
    const startEditSetSong = (type: 'praise' | 'worship', song: WeeklySetSong) => {
        setActiveSetType(type);
        setEditingSetSongId(song.id);
        setEditingSetlistSongData({
            title: song.title,
            key: song.key,
            artist: song.artist,
            url: song.url || "",
            instrumental_url: song.instrumental_url || "",
            instrumental_notes: song.instrumental_notes || ""
        });
        setIsEditSetSongOpen(true);
    };

    const handleSaveEditSetSong = async () => {
        if (!editingSetlistSongData.title.trim() || !activeSetType || !editingSetSongId) return;

        try {
            const updatedSong = await choirService.updateWeeklySong(editingSetSongId, {
                title: editingSetlistSongData.title,
                key: editingSetlistSongData.key,
                artist: editingSetlistSongData.artist,
                url: editingSetlistSongData.url,
                instrumental_url: editingSetlistSongData.instrumental_url,
                instrumental_notes: editingSetlistSongData.instrumental_notes
            });

            const updateList = (list: WeeklySetSong[]) => list.map(s =>
                s.id === editingSetSongId ? updatedSong : s
            );

            if (activeSetType === 'praise') {
                setPraiseSet(updateList(praiseSet) as any);
            } else {
                setWorshipSet(updateList(worshipSet) as any);
            }

            setIsEditSetSongOpen(false);
            setEditingSetSongId(null);
            toast.success("Setlist song updated");
        } catch (e) {
            console.error(e);
            toast.error("Failed to update song");
        }
    };

    const handleImportSetlist = async () => {
        if (!importText.trim() || !importSetType) return;

        const lines = importText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length === 0) return;

        let addedCount = 0;
        let matchedCount = 0;

        try {
            const results = await Promise.all(lines.map(async (line) => {
                // Try to match with library
                const match = allLibrarySongs.find(s => s.title.toLowerCase() === line.toLowerCase());

                const songData = match ? {
                    set_type: importSetType,
                    title: match.title,
                    key: match.key,
                    artist: match.artist || "",
                    url: match.url || "",
                    library_song_id: match.id
                } : {
                    set_type: importSetType,
                    title: line,
                    key: "??",
                    artist: "",
                    url: ""
                };

                if (match) matchedCount++;
                return choirService.addWeeklySong(songData);
            }));

            const newSongs = results as unknown as WeeklySetSong[];
            if (importSetType === 'praise') {
                setPraiseSet(prev => [...prev, ...newSongs]);
            } else {
                setWorshipSet(prev => [...prev, ...newSongs]);
            }

            setIsImportOpen(false);
            setImportText("");
            toast.success(`Imported ${newSongs.length} songs (${matchedCount} matched from library)`);
        } catch (e) {
            console.error(e);
            toast.error("Failed to import some songs");
        }
    };

    const handleImportFolderSongs = async () => {
        if (!importFolderText.trim() || !activeFolderId) return;

        const lines = importFolderText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length === 0) return;

        let matchedCount = 0;

        try {
            const results = await Promise.all(lines.map(async (line) => {
                // Try to match with lyrics in other folders to pre-fill details
                // Exclude current folder to avoid self-match if we were editing (but we are adding new so it's fine)
                const match = allLibrarySongs.find(s => s.title.toLowerCase() === line.toLowerCase());

                const songDetails = match ? {
                    title: match.title,
                    key: match.key || "",
                    artist: match.artist || "",
                    url: match.url || "",
                    notes: match.notes || ""
                } : {
                    title: line,
                    key: "",
                    artist: "",
                    url: "",
                    notes: ""
                };

                if (match) matchedCount++;

                return choirService.addSongToFolder({
                    folder_id: activeFolderId,
                    ...songDetails
                });
            }));

            const newSongs = results as any[]; // Type assertion for the song object

            // Update local state
            setFolders(folders.map(f => {
                if (f.id === activeFolderId) {
                    return { ...f, songs: [...(f.songs || []), ...newSongs] };
                }
                return f;
            }) as any);

            setIsImportFolderOpen(false);
            setImportFolderText("");
            toast.success(`Imported ${newSongs.length} songs to folder (${matchedCount} details matched)`);
        } catch (e) {
            console.error(e);
            toast.error("Failed to import songs to folder");
        }
    };

    // -- Handlers for Instrumental Resources --
    const handleAddInstrResource = async () => {
        if (!newInstr.title.trim()) return;
        try {
            const added = await choirService.addInstrumentalResource(newInstr);
            setInstrResources([...instrResources, added]);
            setNewInstr({ title: "", type: "Tutorial", url: "" });
            setIsAddInstrOpen(false);
            toast.success("Resource added");
        } catch (e) {
            console.error(e);
            toast.error("Failed to add resource");
        }
    };

    const startEditInstrResource = (resource: any) => {
        setEditingInstrId(resource.id);
        setInstrToEdit({ title: resource.title, type: resource.type, url: resource.url || "" });
        setIsEditInstrOpen(true);
    };

    const handleSaveEditInstrResource = async () => {
        if (!editingInstrId || !instrToEdit.title.trim()) return;
        try {
            const updated = await choirService.updateInstrumentalResource(editingInstrId, instrToEdit);
            setInstrResources(instrResources.map(r => r.id === editingInstrId ? updated : r));
            setIsEditInstrOpen(false);
            setEditingInstrId(null);
            toast.success("Resource updated");
        } catch (e) {
            console.error(e);
            toast.error("Failed to update resource");
        }
    };

    const handleDeleteInstrResource = async (id: string) => {
        try {
            await choirService.deleteInstrumentalResource(id);
            setInstrResources(instrResources.filter(r => r.id !== id));
            toast.success("Resource deleted");
        } catch (e) {
            console.error(e);
            toast.error("Failed to delete resource");
        }
    };

    const handleUpdateBandDetails = async (songId: string, updates: { instrumental_url?: string, instrumental_notes?: string }) => {
        try {
            await choirService.updateWeeklySong(songId, updates);
            // Use functional updates to avoid stale closure bugs
            const sync = (list: any[]) => list.map(s => s.id === songId ? { ...s, ...updates } : s);
            setPraiseSet(prev => sync(prev));
            setWorshipSet(prev => sync(prev));
            toast.success("Band details updated");
        } catch (e) {
            console.error(e);
            toast.error("Failed to update band details");
        }
    };

    // -- Handlers for Calendar Events --
    const handleAddCalendarEvent = async () => {
        if (!user || !newEvent.title.trim() || !setlistDate) return;
        try {
            const added = await choirService.addCalendarEvent({
                user_id: user.id,
                title: newEvent.title,
                description: newEvent.description,
                event_date: setlistDate.toISOString().split('T')[0],
                color: newEvent.color
            });
            setCalendarEvents([...calendarEvents, added]);
            setNewEvent({ title: "", description: "", color: "purple" });
            setIsAddEventOpen(false);
            toast.success("Event added to calendar");
        } catch (e) {
            console.error(e);
            toast.error("Failed to add event");
        }
    };

    const handleUpdateCalendarEvent = async () => {
        if (!editingEvent || !newEvent.title.trim()) return;
        try {
            const updated = await choirService.updateCalendarEvent(editingEvent.id, {
                title: newEvent.title,
                description: newEvent.description,
                color: newEvent.color,
                event_date: setlistDate?.toISOString().split('T')[0]
            });
            setCalendarEvents(calendarEvents.map(e => e.id === editingEvent.id ? updated : e));
            setEditingEvent(null);
            setNewEvent({ title: "", description: "", color: "purple" });
            setIsAddEventOpen(false);
            toast.success("Event updated");
        } catch (e) {
            console.error(e);
            toast.error("Failed to update event");
        }
    };

    const handleDeleteCalendarEvent = async (id: string) => {
        try {
            await choirService.deleteCalendarEvent(id);
            setCalendarEvents(calendarEvents.filter(e => e.id !== id));
            toast.success("Event deleted");
        } catch (e) {
            console.error(e);
            toast.error("Failed to delete event");
        }
    };


    const playVideo = (url: string) => {
        try {
            const videoId = extractYoutubeId(url);
            if (videoId) {
                setCurrentVideoUrl(`https://www.youtube.com/embed/${videoId}?autoplay=1`);
            } else {
                window.open(url, "_blank");
            }
        } catch (e) {
            window.open(url, "_blank");
        }
    };

    const activeFolder = folders.find(f => f.id === activeFolderId);

    // Flatten all songs from library for various lookups and selection
    const allLibrarySongs = useMemo(() => {
        return folders.flatMap(f => (f.songs || []).map(s => ({ ...s, folderName: f.name })));
    }, [folders]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 dark:from-slate-900 dark:via-blue-900/10 dark:to-slate-900">

            {/* Video Player Modal */}
            <Dialog open={!!currentVideoUrl} onOpenChange={(open) => !open && setCurrentVideoUrl(null)}>
                <DialogContent className="sm:max-w-[800px] p-0 bg-black overflow-hidden border-none text-white">
                    <div className="aspect-video w-full relative">
                        {currentVideoUrl && (
                            <iframe
                                src={currentVideoUrl}
                                title="Song Video"
                                className="absolute inset-0 w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        )}
                    </div>
                    <div className="p-4 flex justify-end">
                        <Button variant="ghost" className="text-white hover:bg-white/20" onClick={() => setCurrentVideoUrl(null)}>
                            Close Player
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Choir Schedule Modal */}
            <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
                <DialogContent className="w-full h-full max-w-none m-0 rounded-none flex flex-col p-0 bg-white dark:bg-slate-900 overflow-hidden">
                    <DialogHeader className="p-6 pt-[calc(1.5rem+env(safe-area-inset-top))] border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
                            <CalendarIcon className="w-6 h-6 text-blue-600" />
                            Choir Schedule
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-6 space-y-6 px-4 md:px-20 max-w-4xl mx-auto w-full">
                        {/* Thursday Card */}
                        <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-3xl flex gap-4 items-start border border-blue-100/50 dark:border-blue-800/30">
                            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
                                <span className="text-blue-600 dark:text-blue-400 font-bold text-sm uppercase">Thu</span>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Choir Practice</h3>
                                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">6:00 PM</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                                    Main weekly rehearsal. New songs are introduced here. Please verify keys and parts beforehand.
                                </p>
                            </div>
                        </div>

                        {/* Friday Card */}
                        <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-3xl flex gap-4 items-start border border-blue-100/50 dark:border-blue-800/30">
                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                                <span className="text-blue-600 dark:text-blue-400 font-bold text-sm uppercase">Fri</span>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Choir Practice</h3>
                                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">5:40 PM</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                                    Final run-through for Sunday service. Focused on transitions and flow.
                                </p>
                            </div>
                        </div>

                        {/* Sunday Card */}
                        <div className="bg-orange-50/50 dark:bg-orange-900/10 p-5 rounded-3xl flex gap-4 items-start border border-orange-100/50 dark:border-orange-800/30">
                            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                                <span className="text-orange-600 dark:text-orange-400 font-bold text-sm uppercase">Sun</span>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Soundcheck</h3>
                                <p className="text-lg font-bold text-orange-600 dark:text-orange-400">9:30 AM</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                                    Mandatory soundcheck for all serving members. Please be on time.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 md:px-20 max-w-4xl mx-auto w-full">
                        <Button
                            onClick={() => setIsScheduleOpen(false)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-6 text-lg font-bold shadow-xl shadow-blue-500/20"
                        >
                            Close Schedule
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>



            {/* Add / Edit Event Dialog */}
            <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
                <DialogContent className="w-full h-full max-w-none m-0 rounded-none flex flex-col p-0 bg-white dark:bg-slate-900 overflow-hidden">
                    <DialogHeader className="p-6 pt-[calc(1.5rem+env(safe-area-inset-top))] border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
                            <CalendarIcon className="w-6 h-6 text-blue-600" />
                            {editingEvent ? 'Edit Calendar Note' : 'Add Calendar Note'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto py-4 space-y-4 px-4 md:px-20 max-w-4xl mx-auto w-full">
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
                            Organize your schedule for {setlistDate ? format(setlistDate, "do MMM yyyy") : "selected day"}.
                        </p>
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                placeholder="e.g. Choir Practice"
                                value={newEvent.title}
                                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Notes (Optional)</Label>
                            <Textarea
                                id="description"
                                placeholder="Details about this event..."
                                className="min-h-[100px]"
                                value={newEvent.description}
                                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-xs">Color Coordinator</Label>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                {[
                                    { name: 'purple', bg: 'bg-purple-500', label: 'Practice' },
                                    { name: 'blue', bg: 'bg-blue-500', label: 'Event' },
                                    { name: 'orange', bg: 'bg-orange-500', label: 'Urgent' },
                                    { name: 'green', bg: 'bg-green-500', label: 'Notes' },
                                    { name: 'red', bg: 'bg-red-500', label: 'Other' },
                                ].map((c) => (
                                    <button
                                        key={c.name}
                                        type="button"
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all",
                                            newEvent.color === c.name
                                                ? "bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 ring-1 ring-blue-500/20 shadow-sm"
                                                : "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        )}
                                        onClick={() => setNewEvent({ ...newEvent, color: c.name })}
                                    >
                                        <div className={cn("w-3 h-3 rounded-full shrink-0", c.bg)} />
                                        <span className={cn(
                                            "text-xs font-semibold",
                                            newEvent.color === c.name ? "text-slate-900 dark:text-white" : "text-slate-500"
                                        )}>{c.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 pt-4 pb-10">
                        <Button
                            onClick={editingEvent ? handleUpdateCalendarEvent : handleAddCalendarEvent}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-4 text-sm font-bold shadow-lg shadow-blue-500/20"
                        >
                            {editingEvent ? 'Save Changes' : 'Add Note'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsAddEventOpen(false)}
                            className="rounded-xl py-4 text-sm font-bold border-slate-200 dark:border-slate-700 h-auto"
                        >
                            Cancel
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Team Roster Modal */}
            <Dialog open={isRosterOpen} onOpenChange={setIsRosterOpen}>
                <DialogContent className="w-full h-full max-w-none m-0 rounded-none flex flex-col">
                    <DialogHeader className="pt-[calc(1.5rem+env(safe-area-inset-top))] px-6">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <Users className="w-6 h-6 text-blue-600" />
                            Team Roster
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto py-6 space-y-8 px-4 md:px-20 max-w-4xl mx-auto w-full">

                        {/* Praise & Worship Roster */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 border-b border-purple-100 dark:border-purple-800 pb-2">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600">
                                    <Mic className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Praise & Worship</h3>
                            </div>
                            <div className="grid gap-3">
                                {[
                                    { name: "Rekky" },
                                    { name: "Kido" },
                                    { name: "YP Sodiq" },
                                    { name: "Merit" },
                                    { name: "RP Zainab" }
                                ].map((member, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <span className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                                                {i + 1}
                                            </span>
                                            <span className="font-medium text-slate-700 dark:text-slate-200">{member.name}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Prayer Roster */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-800 pb-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Tuesday Prayer</h3>
                                        <p className="text-xs text-blue-600 font-medium">5:30 PM • Zoom</p>
                                    </div>
                                </div>
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => window.open("https://us04web.zoom.us/j/77218043569?pwd=6Aj4q1LLCjKio3x7HMod2tStiH0g7s.1", "_blank")}>
                                    <Video className="w-4 h-4 mr-2" />
                                    Join Zoom
                                </Button>
                            </div>
                            <div className="grid gap-3">
                                {[
                                    { name: "Pastor Deji" },
                                    { name: "Rekky" },
                                    { name: "Kido" },
                                    { name: "YP Sodiq" },
                                    { name: "Merit" },
                                    { name: "RP Zainab" }
                                ].map((member, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <span className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                                                {i + 1}
                                            </span>
                                            <span className="font-medium text-slate-700 dark:text-slate-200">{member.name}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                    <DialogFooter className="md:justify-center pb-8">
                        <Button size="lg" onClick={() => setIsRosterOpen(false)} className="w-full md:w-auto px-12">Close Roster</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Setlist Info Dialog */}
            <Dialog open={isEditSetInfoOpen} onOpenChange={setIsEditSetInfoOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit {editingSetInfoType === 'praise' ? 'Praise' : 'Worship'} Description</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Description / Subtitle</Label>
                            <Input
                                placeholder="e.g. High Energy • 140 BPM"
                                value={tempSetInfo.desc}
                                onChange={(e) => setTempSetInfo({ ...tempSetInfo, desc: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={saveSetInfo} className="bg-blue-600 text-white">Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Add Setlist Song Dialog */}
            < Dialog open={isAddToSetOpen} onOpenChange={setIsAddToSetOpen} >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add to {activeSetType === 'praise' ? 'Praise' : 'Worship'} Set</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Select from Library (Optional)</Label>
                            <Select
                                onValueChange={(val) => {
                                    console.log('Selected value:', val);
                                    const song = allLibrarySongs.find(s => s.id === val);
                                    if (song) {
                                        setNewSetSong({
                                            title: song.title,
                                            key: song.key || "",
                                            artist: song.artist || "",
                                            url: song.url || "",
                                            library_song_id: song.id
                                        });
                                    }
                                }}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={allLibrarySongs.length === 0 ? "Library is empty" : "Quick select a song..."} />
                                </SelectTrigger>
                                <SelectContent position="popper" sideOffset={5} className="max-h-[300px] z-[9999] max-w-[calc(100vw-2rem)] md:max-w-md">
                                    {allLibrarySongs.length > 0 ? (
                                        allLibrarySongs.map(s => (
                                            <SelectItem key={s.id} value={s.id} className="max-w-full">
                                                <div className="flex flex-col gap-0.5 w-full overflow-hidden">
                                                    <span className="truncate font-medium">
                                                        {s.title} {s.artist && `(${s.artist})`}
                                                    </span>
                                                    <span className="truncate text-xs text-slate-500">
                                                        {s.folderName}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-xs text-slate-400">
                                            No songs found in library. Add songs to folders in the Vocalist Library section below.
                                        </div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100 dark:border-slate-800"></span></div>
                            <div className="relative flex justify-center text-[10px] uppercase font-bold"><span className="bg-white dark:bg-slate-900 px-2 text-slate-400">Or enter manually</span></div>
                        </div>

                        <div className="space-y-2">
                            <Label>Song Title</Label>
                            <Input
                                placeholder="e.g. Way Maker"
                                value={newSetSong.title}
                                onChange={(e) => setNewSetSong({ ...newSetSong, title: e.target.value, library_song_id: undefined })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Key</Label>
                                <Input
                                    placeholder="e.g. G"
                                    value={newSetSong.key}
                                    onChange={(e) => setNewSetSong({ ...newSetSong, key: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Artist</Label>
                                <Input
                                    placeholder="e.g. Sinach"
                                    value={newSetSong.artist}
                                    onChange={(e) => setNewSetSong({ ...newSetSong, artist: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Video/Audio URL (Optional)</Label>
                            <Input
                                placeholder="https://youtube.com/..."
                                value={newSetSong.url}
                                onChange={(e) => setNewSetSong({ ...newSetSong, url: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleAddSetSong} className="bg-blue-600 text-white">Add to Set</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Import Setlist Dialog */}
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                <DialogContent className="w-full h-full max-w-none m-0 rounded-none flex flex-col p-0 bg-white dark:bg-slate-900 overflow-hidden">
                    <DialogHeader className="p-6 pt-[calc(1.5rem+env(safe-area-inset-top))] border-b border-slate-100 dark:border-slate-800">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
                            <Download className="w-6 h-6 text-blue-600" />
                            Import from Notes
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-6 space-y-6 px-4 md:px-20 max-w-4xl mx-auto w-full">
                        <div className="space-y-4">
                            <p className="text-slate-500 dark:text-slate-400 font-medium">
                                Paste a list of songs from your notes app (one song per line). We'll try to find matches in your library.
                            </p>
                            <Textarea
                                placeholder="Way Maker&#10;Goodness of God&#10;Agnes Dei"
                                className="min-h-[400px] font-mono text-lg p-6 rounded-3xl border-purple-100 dark:border-purple-800/50 focus-visible:ring-purple-500 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 shadow-inner"
                                value={importText}
                                onChange={(e) => setImportText(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4 pb-20">
                            <Button
                                onClick={handleImportSetlist}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-8 text-xl font-bold shadow-xl shadow-blue-500/20"
                                disabled={!importText.trim()}
                            >
                                Import {importText.split('\n').filter(l => l.trim()).length} Songs
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setIsImportOpen(false)}
                                className="rounded-2xl py-8 text-xl font-bold border-slate-200 dark:border-slate-700 h-auto"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Setlist Song Dialog */}
            < Dialog open={isEditSetSongOpen} onOpenChange={setIsEditSetSongOpen} >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Song</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Song Title</Label>
                            <Input
                                placeholder="e.g. Way Maker"
                                value={editingSetlistSongData.title}
                                onChange={(e) => setEditingSetlistSongData({ ...editingSetlistSongData, title: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Key</Label>
                                <Input
                                    placeholder="e.g. G"
                                    value={editingSetlistSongData.key}
                                    onChange={(e) => setEditingSetlistSongData({ ...editingSetlistSongData, key: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Artist</Label>
                                <Input
                                    placeholder="e.g. Sinach"
                                    value={editingSetlistSongData.artist}
                                    onChange={(e) => setEditingSetlistSongData({ ...editingSetlistSongData, artist: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Video/Audio URL</Label>
                            <Input
                                placeholder="https://youtube.com/..."
                                value={editingSetlistSongData.url}
                                onChange={(e) => setEditingSetlistSongData({ ...editingSetlistSongData, url: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSaveEditSetSong} className="bg-blue-600 text-white">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Edit Library Song Dialog */}
            < Dialog open={isEditSongOpen} onOpenChange={setIsEditSongOpen} >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Song Details</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Song Title</Label>
                            <Input
                                placeholder="e.g. Goodness of God"
                                value={songToEdit.title}
                                onChange={(e) => setSongToEdit({ ...songToEdit, title: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Key</Label>
                                <Input
                                    placeholder="e.g. A"
                                    value={songToEdit.key}
                                    onChange={(e) => setSongToEdit({ ...songToEdit, key: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Artist (Optional)</Label>
                                <Input
                                    placeholder="e.g. CeCe Winans"
                                    value={songToEdit.artist}
                                    onChange={(e) => setSongToEdit({ ...songToEdit, artist: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>YouTube/Audio Link</Label>
                            <Input
                                placeholder="https://..."
                                value={songToEdit.url}
                                onChange={(e) => setSongToEdit({ ...songToEdit, url: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea
                                placeholder="Add notes about structure, harmonies, etc."
                                value={songToEdit.notes}
                                onChange={(e) => setSongToEdit({ ...songToEdit, notes: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSaveEditSong} className="bg-blue-600 text-white">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Hero Header */}
            < div className="relative h-auto md:h-[300px] overflow-hidden pb-8 pt-20 md:pt-0" > {/* Adjusted height/padding for mobile */}
                < div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-500 opacity-90" ></div >
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516280440614-6697288d5d38?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-black/20"></div>

                <div className="relative h-full container mx-auto px-4 flex flex-col justify-end pb-8">
                    <div className="flex justify-between items-start mb-4">  {/* Back Button Container */}
                        <Button
                            variant="ghost"
                            className="text-white/80 hover:text-white hover:bg-white/10 w-fit pl-0"
                            onClick={() => navigate(-1)}
                        >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            Back to Groups
                        </Button>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6"> {/* Mobile Responsive Layout */}
                        <div>
                            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
                                The Power House Choir
                            </h1>
                            <p className="text-blue-100 text-lg md:text-xl font-medium max-w-2xl">
                                Leading the congregation in spirit and truth.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3"> {/* Buttons visible on all screens */}
                            <Button
                                className="bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-700 shadow-lg border-none flex-1 md:flex-none font-bold"
                                onClick={() => setIsScheduleOpen(true)}
                            >
                                <Calendar className="w-4 h-4 mr-2" />
                                Schedule
                            </Button>
                            <Button
                                className="bg-blue-500/30 text-white hover:bg-blue-500/40 backdrop-blur-md border border-white/20 flex-1 md:flex-none"
                                onClick={() => setIsRosterOpen(true)}
                            >
                                <Users className="w-4 h-4 mr-2" />
                                Team Roster
                            </Button>
                        </div>
                    </div>
                </div>
            </div >

            {/* Main Content */}
            < div id="main-content" className="container mx-auto px-4 py-8 -mt-6 relative z-10" >
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex justify-center mb-8 overflow-x-auto no-scrollbar pb-2">
                        <TabsList className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-1 rounded-full shadow-lg border border-blue-100 dark:border-blue-900/30 h-auto flex-nowrap shrink-0 mx-auto">
                            <TabsTrigger
                                value="vocalists"
                                className="rounded-full px-4 md:px-8 py-2 md:py-3 text-xs md:text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all data-[state=active]:shadow-md flex items-center shrink-0"
                            >
                                <Mic className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                                Vocalists
                            </TabsTrigger>
                            <TabsTrigger
                                value="instrumentalists"
                                className="rounded-full px-4 md:px-8 py-2 md:py-3 text-xs md:text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all data-[state=active]:shadow-md flex items-center shrink-0"
                            >
                                <Music className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                                Instrumentalists
                            </TabsTrigger>
                            <TabsTrigger
                                value="academy"
                                className="rounded-full px-4 md:px-8 py-2 md:py-3 text-xs md:text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all data-[state=active]:shadow-md flex items-center shrink-0"
                            >
                                <BookOpen className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                                Academy
                            </TabsTrigger>

                        </TabsList>
                    </div>

                    <TabsContent value="vocalists" className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">



                        {/* SPLIT SETLIST SECTION */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                    <ListMusic className="w-6 h-6 mr-3 text-blue-600" />
                                    This Week's Setlist
                                </h2>

                                {/* Date Picker Popover */}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "h-12 rounded-2xl border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-100 pl-4 text-left font-bold shadow-sm",
                                                !setlistDate && "text-muted-foreground"
                                            )}
                                        >
                                            {setlistDate ? (
                                                format(setlistDate, "do MMM yyyy")
                                            ) : (
                                                <span>Select Service Date</span>
                                            )}
                                            <CalendarIcon className="ml-3 h-5 w-5 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="end">
                                        <CalendarComponent
                                            mode="single"
                                            selected={setlistDate}
                                            onSelect={handleDateSelect}
                                            initialFocus
                                            disabled={(date) => date.getDay() !== 1}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Praise Set */}
                                <Card className="border-none shadow-lg bg-blue-50/50 dark:bg-blue-900/10 border-t-4 border-blue-500">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <div className="space-y-1">
                                            <CardTitle className="text-blue-700 dark:text-blue-400 flex items-center">
                                                <PlayCircle className="w-5 h-5 mr-2" />
                                                {praiseInfo.title}
                                            </CardTitle>
                                            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => openEditSetInfo('praise')}>
                                                <CardDescription className="cursor-pointer group-hover:text-orange-600 transition-colors">
                                                    {praiseInfo.desc}
                                                </CardDescription>
                                                <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-orange-600 opacity-0 group-hover:opacity-100 transition-all" />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="icon" variant="ghost" className="text-orange-600 hover:bg-orange-100/50" onClick={() => {
                                                setImportSetType('praise');
                                                setIsImportOpen(true);
                                            }}>
                                                <Download className="w-5 h-5" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="text-orange-600 hover:bg-orange-100/50" onClick={() => openAddSetSong('praise')}>
                                                <Plus className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3 pt-4">
                                        {praiseSet.map((song, i) => (
                                            <div key={song.id} className="flex items-center justify-between p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl shadow-sm group">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-blue-500 font-bold w-4">{i + 1}</span>
                                                    <div>
                                                        <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                            {song.title}
                                                            {song.url && (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="bg-blue-100 text-blue-600 hover:bg-blue-200 cursor-pointer flex items-center gap-1 py-0 px-1.5 h-4 text-[10px]"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        playVideo(song.url!);
                                                                    }}
                                                                >
                                                                    <PlayCircle className="w-2.5 h-2.5" /> Play
                                                                </Badge>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-slate-500">{song.artist}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                                        {song.key}
                                                    </Badge>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <MoreVertical className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onClick={() => startEditSetSong('praise', song)}>
                                                                <Pencil className="w-4 h-4 mr-2" /> Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="text-red-600" onClick={() => removeSetSong('praise', song.id)}>
                                                                <Trash2 className="w-4 h-4 mr-2" /> Remove
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        ))}
                                        {praiseSet.length === 0 && (
                                            <p className="text-center text-sm text-slate-400 py-4 italic">No songs added yet.</p>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Worship Set */}
                                <Card className="border-none shadow-lg bg-blue-50/50 dark:bg-blue-900/10 border-t-4 border-blue-500">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <div className="space-y-1">
                                            <CardTitle className="text-blue-700 dark:text-blue-400 flex items-center">
                                                <Heart className="w-5 h-5 mr-2" />
                                                {worshipInfo.title}
                                            </CardTitle>
                                            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => openEditSetInfo('worship')}>
                                                <CardDescription className="cursor-pointer group-hover:text-blue-600 transition-colors">
                                                    {worshipInfo.desc}
                                                </CardDescription>
                                                <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all" />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="icon" variant="ghost" className="text-blue-600 hover:bg-blue-100/50" onClick={() => {
                                                setImportSetType('worship');
                                                setIsImportOpen(true);
                                            }}>
                                                <Download className="w-5 h-5" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="text-blue-600 hover:bg-blue-100/50" onClick={() => openAddSetSong('worship')}>
                                                <Plus className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3 pt-4">
                                        {worshipSet.map((song, i) => (
                                            <div key={song.id} className="flex items-center justify-between p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl shadow-sm group">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-blue-500 font-bold w-4">{i + 1}</span>
                                                    <div>
                                                        <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                            {song.title}
                                                            {song.url && (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="bg-blue-100 text-blue-600 hover:bg-blue-200 cursor-pointer flex items-center gap-1 py-0 px-1.5 h-4 text-[10px]"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        playVideo(song.url!);
                                                                    }}
                                                                >
                                                                    <PlayCircle className="w-2.5 h-2.5" /> Play
                                                                </Badge>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-slate-500">{song.artist}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                                        {song.key}
                                                    </Badge>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <MoreVertical className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onClick={() => startEditSetSong('worship', song)}>
                                                                <Pencil className="w-4 h-4 mr-2" /> Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="text-red-600" onClick={() => removeSetSong('worship', song.id)}>
                                                                <Trash2 className="w-4 h-4 mr-2" /> Remove
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        ))}
                                        {worshipSet.length === 0 && (
                                            <p className="text-center text-sm text-slate-400 py-4 italic">No songs added yet.</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* INTERACTIVE LIBRARY SECTION */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                    <BookOpen className="w-6 h-6 mr-3 text-blue-600" />
                                    Vocalist Library
                                </h2>
                            </div>

                            <Card className="border-none shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md min-h-[400px] flex flex-col">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800">
                                    <div className="flex items-center gap-2">
                                        <FolderOpen className="w-5 h-5 text-blue-500" />
                                        {activeFolderId ? (
                                            <div className="flex items-center gap-1 overflow-hidden">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setActiveFolderId(null)}
                                                    className="text-slate-500 hover:text-blue-600 h-7 px-2 text-xs"
                                                >
                                                    Library
                                                </Button>
                                                <span className="text-slate-300">/</span>
                                                <span className="font-semibold text-blue-600 truncate max-w-[150px]">{activeFolder?.name}</span>
                                            </div>
                                        ) : (
                                            <span className="font-semibold text-slate-700 dark:text-slate-200 pl-2">Folders</span>
                                        )}
                                    </div>

                                    <div className="flex gap-2 shrink-0">
                                        <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
                                            <DialogTrigger asChild>
                                                <Button size="sm" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                                                    <Folder className="w-4 h-4 sm:mr-2" />
                                                    <span className="hidden sm:inline">New Folder</span>
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Create New {activeFolderId ? "Subfolder" : "Folder"}</DialogTitle>
                                                </DialogHeader>
                                                <div className="py-4">
                                                    <Label>Folder Name</Label>
                                                    <Input
                                                        placeholder="e.g. Wedding Set"
                                                        className="mt-2"
                                                        value={newFolderName}
                                                        onChange={(e) => setNewFolderName(e.target.value)}
                                                    />
                                                </div>
                                                <DialogFooter>
                                                    <Button onClick={handleCreateFolder} className="bg-blue-600 text-white">Create</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>

                                        {activeFolderId && (
                                            <div className="flex gap-2">
                                                <Dialog open={isImportFolderOpen} onOpenChange={setIsImportFolderOpen}>
                                                    <DialogTrigger asChild>
                                                        <Button size="sm" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                                                            <Download className="w-4 h-4 sm:mr-2" />
                                                            <span className="hidden sm:inline">Import</span>
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="w-full h-full max-w-none m-0 rounded-none flex flex-col p-0 bg-white dark:bg-slate-900 overflow-hidden">
                                                        <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
                                                            <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
                                                                <Download className="w-6 h-6 text-blue-600" />
                                                                Import Songs to Folder
                                                            </DialogTitle>
                                                        </DialogHeader>

                                                        <div className="flex-1 overflow-y-auto py-6 space-y-6 px-4 md:px-20 max-w-4xl mx-auto w-full">
                                                            <div className="space-y-4">
                                                                <p className="text-slate-500 dark:text-slate-400 font-medium">
                                                                    Paste a list of songs (one song per line). We'll try to find matches in your library to pre-fill details.
                                                                </p>
                                                                <Textarea
                                                                    placeholder="Way Maker&#10;Goodness of God&#10;Agnes Dei"
                                                                    className="min-h-[400px] font-mono text-lg p-6 rounded-3xl border-blue-100 dark:border-blue-800/50 focus-visible:ring-blue-500 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 shadow-inner"
                                                                    value={importFolderText}
                                                                    onChange={(e) => setImportFolderText(e.target.value)}
                                                                />
                                                            </div>

                                                            <div className="flex flex-col sm:flex-row gap-4 pt-4 pb-20">
                                                                <Button
                                                                    onClick={handleImportFolderSongs}
                                                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-8 text-xl font-bold shadow-xl shadow-blue-500/20"
                                                                    disabled={!importFolderText.trim()}
                                                                >
                                                                    Import {importFolderText.split('\n').filter(l => l.trim()).length} Songs
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    onClick={() => setIsImportFolderOpen(false)}
                                                                    className="rounded-2xl py-8 text-xl font-bold border-slate-200 dark:border-slate-700 h-auto"
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>

                                                <Dialog open={isAddSongOpen} onOpenChange={setIsAddSongOpen}>
                                                    <DialogTrigger asChild>
                                                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                                                            <Plus className="w-4 h-4 sm:mr-2" />
                                                            <span className="hidden sm:inline">Add Song</span>
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Add Song to {activeFolder?.name}</DialogTitle>
                                                        </DialogHeader>
                                                        <div className="space-y-4 py-4">
                                                            <div className="space-y-2">
                                                                <Label>Song Title</Label>
                                                                <Input
                                                                    placeholder="e.g. Goodness of God"
                                                                    value={newSong.title}
                                                                    onChange={(e) => setNewSong({ ...newSong, title: e.target.value })}
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="space-y-2">
                                                                    <Label>Key</Label>
                                                                    <Input
                                                                        placeholder="e.g. A"
                                                                        value={newSong.key}
                                                                        onChange={(e) => setNewSong({ ...newSong, key: e.target.value })}
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label>Artist (Optional)</Label>
                                                                    <Input
                                                                        placeholder="e.g. CeCe Winans"
                                                                        value={newSong.artist}
                                                                        onChange={(e) => setNewSong({ ...newSong, artist: e.target.value })}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>YouTube/Audio Link</Label>
                                                                <Input
                                                                    placeholder="https://..."
                                                                    value={newSong.url}
                                                                    onChange={(e) => setNewSong({ ...newSong, url: e.target.value })}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>Notes</Label>
                                                                <Textarea
                                                                    placeholder="Add notes about structure, harmonies, etc."
                                                                    value={newSong.notes}
                                                                    onChange={(e) => setNewSong({ ...newSong, notes: e.target.value })}
                                                                />
                                                            </div>
                                                        </div>
                                                        <DialogFooter>
                                                            <Button onClick={handleAddSong} className="bg-blue-600 text-white">Save Song</Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <CardContent className="p-6 flex-1 overflow-y-auto">
                                    {!activeFolderId ? (
                                        // Folder Grid View (Root only)
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {folders.filter(f => !f.parent_id).map(folder => (
                                                <div
                                                    key={folder.id}
                                                    onClick={() => setActiveFolderId(folder.id)}
                                                    className="bg-white dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-500 transition-all cursor-pointer group flex flex-col items-center text-center gap-3 relative"
                                                >
                                                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-300 group-hover:text-blue-600 group-hover:bg-blue-100 transition-colors">
                                                        <FolderOpen className="w-8 h-8" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{folder.name}</h3>
                                                        <p className="text-xs text-slate-400">
                                                            {(folder.songs?.length || 0) + (folders.filter(f => f.parent_id === folder.id).length)} items
                                                        </p>
                                                    </div>

                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button size="icon" variant="ghost" className="h-6 w-6">
                                                                    <MoreVertical className="w-4 h-4 text-slate-400" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent>
                                                                <DropdownMenuItem className="text-red-600" onClick={() => deleteFolder(folder.id)}>
                                                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>
                                            ))}
                                            {folders.filter(f => !f.parent_id).length === 0 && (
                                                <div className="col-span-full py-12 text-center text-slate-400">
                                                    <Folder className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                    <p>No folders yet. Create one to organize your songs!</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        // Active Folder View: Show Subfolders AND Songs
                                        <div className="space-y-6">
                                            {/* Subfolders if any */}
                                            {folders.filter(f => f.parent_id === activeFolderId).length > 0 && (
                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subfolders</h4>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {folders.filter(f => f.parent_id === activeFolderId).map(folder => (
                                                            <div
                                                                key={folder.id}
                                                                onClick={() => setActiveFolderId(folder.id)}
                                                                className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group flex flex-col items-center text-center gap-2 relative"
                                                            >
                                                                <FolderOpen className="w-8 h-8 text-blue-400 group-hover:text-blue-600" />
                                                                <div>
                                                                    <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">{folder.name}</h3>
                                                                    <p className="text-[10px] text-slate-400">
                                                                        {(folder.songs?.length || 0) + (folders.filter(f => f.parent_id === folder.id).length)} items
                                                                    </p>
                                                                </div>
                                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button size="icon" variant="ghost" className="h-5 w-5">
                                                                                <MoreVertical className="w-3 h-3 text-slate-400" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent>
                                                                            <DropdownMenuItem className="text-red-600" onClick={() => deleteFolder(folder.id)}>
                                                                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                                            </DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Songs List */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Songs</h4>
                                                </div>
                                                {!activeFolder?.songs || activeFolder.songs.length === 0 ? (
                                                    <div className="text-center py-12 text-slate-400">
                                                        <Music className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                        <p>This folder is empty. Add your first song!</p>
                                                    </div>
                                                ) : (
                                                    activeFolder.songs.map((song) => (
                                                        <div key={song.id} className="bg-white dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:shadow-md transition-all flex items-start justify-between group">
                                                            <div className="flex items-start gap-4">
                                                                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 font-bold shrink-0 mt-1">
                                                                    {song.key}
                                                                </div>
                                                                <div>
                                                                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{song.title}</h3>
                                                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                                                        <span className="font-medium">{song.artist}</span>
                                                                        {song.url && (
                                                                            <Badge
                                                                                variant="secondary"
                                                                                className="bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer flex items-center gap-1 py-0 px-2 h-5"
                                                                                onClick={() => playVideo(song.url!)}
                                                                            >
                                                                                <PlayCircle className="w-3 h-3" /> Play
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    {song.notes && (
                                                                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 bg-yellow-50 dark:bg-yellow-900/10 p-2 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
                                                                            📝 {song.notes}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400">
                                                                            <MoreVertical className="w-4 h-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent>
                                                                        <DropdownMenuItem onClick={() => {
                                                                            setNewSetSong({
                                                                                title: song.title,
                                                                                key: song.key || "",
                                                                                artist: song.artist || "",
                                                                                url: song.url || "",
                                                                                library_song_id: song.id
                                                                            });
                                                                            setIsAddToSetOpen(true);
                                                                            setActiveSetType('praise'); // Default or let them choose
                                                                        }}>
                                                                            <PlusCircle className="w-4 h-4 mr-2" /> Add to Setlist
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem onClick={() => startEditSong(song)}>
                                                                            <Pencil className="w-4 h-4 mr-2" /> Edit
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteSong(song.id)}>
                                                                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                    </TabsContent>

                    <TabsContent value="instrumentalists" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Tutorials & Resources</h2>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setIsAddInstrOpen(true)}>
                                <Plus className="w-4 h-4 mr-2" /> Add Resource
                            </Button>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {instrResources.length === 0 ? (
                                <div className="col-span-full py-12 text-center text-slate-400 bg-white/50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                    <Video className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>No resources yet. Add tutorials for the band!</p>
                                </div>
                            ) : (
                                instrResources.map((resource) => (
                                    <Card key={resource.id} className="group hover:shadow-xl transition-all duration-300 border-none shadow-md bg-white/80 dark:bg-slate-800/80 overflow-hidden relative">
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button size="icon" variant="secondary" className="h-8 w-8 bg-white/90 dark:bg-slate-800/90 shadow-sm">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => startEditInstrResource(resource)}>
                                                        <Pencil className="w-4 h-4 mr-2" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteInstrResource(resource.id)}>
                                                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <div
                                            className="h-32 bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10 transition-colors cursor-pointer relative"
                                            onClick={() => resource.url && playVideo(resource.url)}
                                        >
                                            {getYTThumbnail(resource.url) ? (
                                                <div className="w-full h-full relative">
                                                    <img src={getYTThumbnail(resource.url)!} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <PlayCircle className="w-12 h-12 text-white drop-shadow-lg" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <Video className="w-10 h-10 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                            )}
                                        </div>
                                        <CardContent className="p-4">
                                            <Badge variant="secondary" className="mb-2 text-xs font-normal">
                                                {resource.type}
                                            </Badge>
                                            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1 group-hover:text-blue-600 transition-colors truncate">
                                                {resource.title}
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                {new Date(resource.created_at).toLocaleDateString()}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>

                        {/* Band Weekly Setlist Section */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <ListMusic className="w-6 h-6 text-blue-500" />
                                Band Setlist View
                            </h2>
                            <p className="text-slate-500 text-sm">Chord charts, dynamics, and band-specific instructions for this week.</p>

                            <div className="grid lg:grid-cols-2 gap-6">
                                {/* Praise Set for Band */}
                                <Card className="border-none shadow-lg bg-white/90 dark:bg-slate-800/90 overflow-hidden">
                                    <div className="bg-blue-600 p-4 text-white">
                                        <h3 className="font-bold flex items-center gap-2">
                                            <Zap className="w-5 h-5 fill-current" /> Praise Set
                                        </h3>
                                    </div>
                                    <CardContent className="p-4 space-y-4">
                                        {praiseSet.length === 0 ? (
                                            <p className="text-center py-8 text-slate-400">No songs in praise set</p>
                                        ) : (
                                            praiseSet.map((song) => (
                                                <BandSongCard key={song.id} song={song} allLibrarySongs={allLibrarySongs} onUpdate={handleUpdateBandDetails} />
                                            ))
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Worship Set for Band */}
                                <Card className="border-none shadow-lg bg-white/90 dark:bg-slate-800/90 overflow-hidden">
                                    <div className="bg-indigo-700 p-4 text-white">
                                        <h3 className="font-bold flex items-center gap-2">
                                            <Waves className="w-5 h-5" /> Worship Set
                                        </h3>
                                    </div>
                                    <CardContent className="p-4 space-y-4">
                                        {worshipSet.length === 0 ? (
                                            <p className="text-center py-8 text-slate-400">No songs in worship set</p>
                                        ) : (
                                            worshipSet.map((song) => (
                                                <BandSongCard key={song.id} song={song} allLibrarySongs={allLibrarySongs} onUpdate={handleUpdateBandDetails} />
                                            ))
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="academy" className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Academy Header */}
                        <div className="relative overflow-hidden rounded-[3rem] bg-slate-900 border border-slate-800 p-8 md:p-12 shadow-2xl">
                            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-600/20 to-transparent pointer-events-none" />
                            <div className="relative z-10 max-w-2xl">
                                <Badge className="bg-blue-600 text-white border-blue-500 text-[10px] uppercase font-bold tracking-[0.2em] px-4 py-1.5 rounded-full mb-6">
                                    Introducing High Excellence
                                </Badge>
                                <h2 className="text-4xl md:text-5xl font-black text-white mb-6 uppercase tracking-tight leading-none">
                                    The Power House <span className="text-blue-500">Choir Academy</span>
                                </h2>
                                <p className="text-slate-400 text-lg font-medium leading-relaxed italic pr-8 mb-8 border-l-2 border-blue-600 pl-6">
                                    Elevating our worship through professional training, spiritual alignment, and technical mastery.
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    <div className="flex items-center gap-2 text-slate-300 bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700">
                                        <Users className="w-4 h-4 text-blue-500" />
                                        <span className="text-sm font-bold">12+ Professional Courses</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-300 bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700">
                                        <Zap className="w-4 h-4 text-amber-500" />
                                        <span className="text-sm font-bold">Expert Instructors</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Course Sections */}
                        {academyCourses.map((section, idx) => (
                            <div key={idx} className="space-y-8">
                                <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-100 dark:border-slate-800 pb-6 gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3 text-blue-600 dark:text-blue-500">
                                            {section.icon}
                                            <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                                {section.title}
                                            </h3>
                                        </div>
                                        <p className="text-slate-500 font-medium italic">{section.description}</p>
                                    </div>
                                    <Badge variant="outline" className="w-fit text-[10px] font-black tracking-widest uppercase border-blue-100 text-blue-500 bg-blue-50/30 px-4 py-1 rounded-full">
                                        Professional Track
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {section.courses.map((course, cIdx) => (
                                        <AcademyCourseCard key={cIdx} course={course} onAccess={handleAccessCourse} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </TabsContent>

                </Tabs>

                {/* Course Detail Modal */}
                <Dialog open={isCourseModalOpen} onOpenChange={setIsCourseModalOpen}>
                    <DialogContent className="max-w-none w-screen h-screen m-0 p-0 border-none bg-white dark:bg-slate-900 rounded-none shadow-2xl overflow-hidden flex flex-col">
                        {/* Custom Header for Full Screen Modal */}
                        <div className="flex items-center justify-between p-6 pt-[calc(1.5rem+env(safe-area-inset-top))] border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
                            <div className="flex items-center gap-4">
                                <Button variant="ghost" size="sm" onClick={() => setIsCourseModalOpen(false)} className="rounded-full h-10 w-10 p-0">
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                                <div>
                                    <h3 className="font-black uppercase tracking-tight text-sm text-blue-600">The Power House Choir Academy</h3>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedCourse?.title}</p>
                                </div>
                            </div>
                            <Badge className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-none px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase">
                                {selectedCourse?.modules?.length || 0} ADVANCED MODULES
                            </Badge>
                        </div>

                        <div id="course-modal-content" className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                            {selectedCourse && (
                                <div className="max-w-6xl mx-auto flex flex-col pb-20">
                                    {/* Modal Header/Banner */}
                                    <div className="relative h-64 md:h-[50vh] w-full overflow-hidden mt-6 rounded-[3rem] shadow-2xl">
                                        <img
                                            src={selectedCourse.image}
                                            alt={selectedCourse.title}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
                                        <div className="absolute bottom-12 left-12 right-12">
                                            <Badge className="bg-blue-600 text-white border-blue-500 text-[10px] uppercase font-bold tracking-[0.2em] px-4 py-2 rounded-full mb-6 shadow-lg shadow-blue-500/20">
                                                {selectedCourse.category} • {selectedCourse.level}
                                            </Badge>
                                            <h2 className="text-4xl md:text-7xl font-black text-white uppercase tracking-tighter leading-[0.9] mb-4">
                                                {selectedCourse.title}
                                            </h2>
                                            <div className="flex items-center gap-6 text-slate-200">
                                                <div className="flex items-center gap-2 text-base font-bold">
                                                    <Clock className="w-5 h-5 text-blue-400" />
                                                    {selectedCourse.duration}
                                                </div>
                                                <div className="flex items-center gap-2 text-base font-bold border-l border-white/20 pl-6">
                                                    <Users className="w-5 h-5 text-emerald-400" />
                                                    1,200+ Students enrolled
                                                </div>
                                            </div>
                                        </div>
                                    </div>


                                    {/* Modal Body */}
                                    <div className="p-8 md:p-12 space-y-12">
                                        {/* Introduction */}
                                        <section className="space-y-4">
                                            <div className="flex items-center gap-3 text-blue-600">
                                                <Zap className="w-6 h-6" />
                                                <h3 className="text-xl font-black uppercase tracking-tight">Executive Summary</h3>
                                            </div>
                                            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed italic border-l-4 border-blue-600/30 pl-6">
                                                {selectedCourse.description} This course is designed to transition you from technical competence to spiritual and professional mastery.
                                            </p>
                                        </section>

                                        {/* Progress Tracker */}
                                        {selectedCourse.modules && (
                                            <section className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-6 rounded-[2rem] border-2 border-emerald-300 dark:border-emerald-700 shadow-lg">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
                                                            <span className="text-white font-black text-xl">
                                                                {Math.round((Array.from(completedModules).filter(id => id.startsWith(selectedCourse.id)).length / selectedCourse.modules.length) * 100)}%
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <h3 className="text-lg font-black text-emerald-900 dark:text-emerald-100 uppercase">Your Progress</h3>
                                                            <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                                                                {Array.from(completedModules).filter(id => id.startsWith(selectedCourse.id)).length} of {selectedCourse.modules.length} modules completed
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {Array.from(completedModules).filter(id => id.startsWith(selectedCourse.id)).length === selectedCourse.modules.length && (
                                                        <Badge className="bg-yellow-400 text-yellow-900 border-none px-4 py-2 text-sm font-black animate-pulse">
                                                            🏆 COURSE MASTERED!
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="relative h-4 bg-white dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                                    <div
                                                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 rounded-full flex items-center justify-end pr-2"
                                                        style={{ width: `${(Array.from(completedModules).filter(id => id.startsWith(selectedCourse.id)).length / selectedCourse.modules.length) * 100}%` }}
                                                    >
                                                        {Array.from(completedModules).filter(id => id.startsWith(selectedCourse.id)).length > 0 && (
                                                            <span className="text-white font-black text-[10px]">
                                                                {Array.from(completedModules).filter(id => id.startsWith(selectedCourse.id)).length}/{selectedCourse.modules.length}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </section>
                                        )}

                                        {/* Lecture Notes Section */}
                                        <section className="space-y-12 bg-slate-50 dark:bg-slate-800/50 p-8 md:p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 text-slate-800 dark:text-slate-100">
                                                    <BookOpen className="w-6 h-6 text-blue-600" />
                                                    <h4 className="text-2xl font-black uppercase tracking-tight">Professional Curriculum</h4>
                                                </div>
                                                <Badge className="bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 text-[10px] font-black tracking-widest px-3 py-1 rounded-full shadow-sm">
                                                    ACADEMY STANDARD • 2026
                                                </Badge>
                                            </div>

                                            <div className="prose prose-slate dark:prose-invert max-w-none space-y-12">
                                                {selectedCourse.modules?.map((module: any, mIdx: number) => {
                                                    const moduleId = `${selectedCourse.id}-${mIdx}`;
                                                    const isCompleted = completedModules.has(moduleId);

                                                    return (
                                                        <div key={mIdx} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${mIdx * 150}ms` }}>
                                                            <div className="flex items-start gap-4">
                                                                <div className="relative">
                                                                    <span className={`w-10 h-10 rounded-2xl ${isCompleted ? 'bg-emerald-600' : 'bg-blue-600'} text-white flex items-center justify-center text-sm font-black shrink-0 shadow-lg shadow-blue-500/20 transition-all duration-300`}>
                                                                        {isCompleted ? '✓' : String(mIdx + 1).padStart(2, '0')}
                                                                    </span>
                                                                    {isCompleted && (
                                                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                                                                            <span className="text-[10px]">⭐</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="space-y-4 flex-1">
                                                                    <div className="flex items-start justify-between">
                                                                        <h5 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none pt-2">
                                                                            {module.title}
                                                                        </h5>
                                                                        <Button
                                                                            size="sm"
                                                                            variant={isCompleted ? "outline" : "default"}
                                                                            onClick={() => {
                                                                                const newSet = new Set(completedModules);
                                                                                if (isCompleted) {
                                                                                    newSet.delete(moduleId);
                                                                                } else {
                                                                                    newSet.add(moduleId);
                                                                                    toast.success('Module completed! 🎉');
                                                                                }
                                                                                setCompletedModules(newSet);
                                                                            }}
                                                                            className="text-xs"
                                                                        >
                                                                            {isCompleted ? 'Undo' : 'Mark Complete'}
                                                                        </Button>
                                                                    </div>
                                                                    <p className="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                                                                        {module.content}
                                                                    </p>

                                                                    {/* Audio Player */}
                                                                    {module.audioUrl && (
                                                                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-2xl border-2 border-blue-200 dark:border-blue-800 shadow-lg">
                                                                            <div className="flex items-center justify-between mb-4">
                                                                                <div className="flex items-center gap-2">
                                                                                    <Music className="w-5 h-5 text-blue-600" />
                                                                                    <span className="font-bold text-blue-900 dark:text-blue-100">Practice Audio</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-xs text-slate-600 dark:text-slate-400">Speed:</span>
                                                                                    {[0.5, 0.75, 1, 1.25].map(speed => (
                                                                                        <button
                                                                                            key={speed}
                                                                                            onClick={() => setCurrentAudio(prev => prev ? { ...prev, speed } : null)}
                                                                                            className={`px-2 py-1 rounded text-xs font-bold transition-all ${currentAudio?.speed === speed
                                                                                                ? 'bg-blue-600 text-white'
                                                                                                : 'bg-white dark:bg-slate-800 text-blue-600 hover:bg-blue-100'
                                                                                                }`}
                                                                                        >
                                                                                            {speed}x
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                            <audio
                                                                                controls
                                                                                className="w-full"
                                                                                src={module.audioUrl}
                                                                            />
                                                                        </div>
                                                                    )}

                                                                    {/* Interactive Exercises */}
                                                                    {module.exercises?.map((exercise: any, eIdx: number) => (
                                                                        <div key={eIdx} className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-6 rounded-2xl border-2 border-amber-300 dark:border-amber-700 shadow-xl">
                                                                            <div className="flex items-center gap-3 mb-4">
                                                                                <Zap className="w-6 h-6 text-amber-600" />
                                                                                <h6 className="text-xl font-black text-amber-900 dark:text-amber-100 uppercase">
                                                                                    {exercise.title}
                                                                                </h6>
                                                                            </div>
                                                                            <p className="text-sm text-amber-800 dark:text-amber-200 mb-4 font-medium">
                                                                                {exercise.instructions}
                                                                            </p>

                                                                            {/* Breath Timer Exercise */}
                                                                            {exercise.type === 'breath-timer' && (
                                                                                <div className="space-y-4">
                                                                                    <div className="flex gap-2">
                                                                                        {exercise.durations.map((duration: number) => (
                                                                                            <Button
                                                                                                key={duration}
                                                                                                onClick={() => {
                                                                                                    setBreathTimerActive(true);
                                                                                                    setBreathPhase('inhale');
                                                                                                    setBreathCount(duration);
                                                                                                    toast.success(`Starting ${duration}-count exercise!`);
                                                                                                }}
                                                                                                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                                                                                            >
                                                                                                {duration} Counts
                                                                                            </Button>
                                                                                        ))}
                                                                                    </div>
                                                                                    {breathTimerActive && (
                                                                                        <div className="text-center p-6 bg-white dark:bg-slate-800 rounded-xl">
                                                                                            <div className="text-6xl font-black mb-2">{breathCount}</div>
                                                                                            <div className="text-2xl font-bold text-amber-600 uppercase">{breathPhase}</div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}

                                                                            {/* Metronome Exercise */}
                                                                            {exercise.type === 'metronome' && (
                                                                                <div className="space-y-4">
                                                                                    <div className="flex items-center gap-4">
                                                                                        <span className="font-bold">BPM:</span>
                                                                                        <input
                                                                                            type="range"
                                                                                            min={exercise.tempoRange[0]}
                                                                                            max={exercise.tempoRange[1]}
                                                                                            value={metronomeBPM}
                                                                                            onChange={(e) => setMetronomeBPM(Number(e.target.value))}
                                                                                            className="flex-1"
                                                                                        />
                                                                                        <span className="font-black text-2xl text-blue-600">{metronomeBPM}</span>
                                                                                    </div>
                                                                                    <Button
                                                                                        onClick={() => {
                                                                                            setMetronomeActive(!metronomeActive);
                                                                                            toast.success(metronomeActive ? 'Metronome stopped' : 'Metronome started!');
                                                                                        }}
                                                                                        className={`w-full ${metronomeActive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold py-4`}
                                                                                    >
                                                                                        {metronomeActive ? '⏹ Stop' : '▶ Start'} Metronome
                                                                                    </Button>
                                                                                    {metronomeActive && (
                                                                                        <div className="flex justify-center gap-2">
                                                                                            {[0, 1, 2, 3].map(i => (
                                                                                                <div
                                                                                                    key={i}
                                                                                                    className="w-4 h-4 rounded-full bg-blue-600 animate-pulse"
                                                                                                    style={{ animationDelay: `${i * (60 / metronomeBPM)}s` }}
                                                                                                />
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}

                                                                            {/* Posture Check Exercise */}
                                                                            {exercise.type === 'posture-check' && exercise.checkpoints && (
                                                                                <div className="space-y-2">
                                                                                    {exercise.checkpoints.map((checkpoint: string, cIdx: number) => (
                                                                                        <div key={cIdx} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
                                                                                            <input type="checkbox" className="w-5 h-5" />
                                                                                            <span className="font-medium">{checkpoint}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}

                                                                            {/* Vowel Practice Exercise */}
                                                                            {exercise.type === 'vowel-practice' && exercise.vowels && (
                                                                                <div className="grid grid-cols-5 gap-2">
                                                                                    {exercise.vowels.map((vowel: string) => (
                                                                                        <button
                                                                                            key={vowel}
                                                                                            className="aspect-square bg-gradient-to-br from-pink-500 to-purple-600 text-white text-3xl font-black rounded-2xl hover:scale-110 transition-transform shadow-lg"
                                                                                            onClick={() => toast.success(`Practice vowel: ${vowel}`)}
                                                                                        >
                                                                                            {vowel}
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}

                                                                    <div className="flex gap-4 pt-2">
                                                                        <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-2">
                                                                            <Zap className="w-4 h-4 text-blue-600" />
                                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                                                {module.exercises ? 'Interactive Practice' : 'Technical Insight'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-2">
                                                                            <Clock className="w-4 h-4 text-emerald-600" />
                                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">45m Session</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {mIdx < selectedCourse.modules.length - 1 && (
                                                                <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent opacity-50" />
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </section>

                                        {/* Action Footer */}
                                        <div className="flex flex-col md:flex-row gap-6 pt-8">
                                            <Button
                                                onClick={handleNextLesson}
                                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-10 h-auto rounded-[2rem] shadow-2xl shadow-blue-500/30 font-black text-xl group transition-all duration-300"
                                            >
                                                CONTINUE TO NEXT LESSON <PlayCircle className="w-8 h-8 ml-4 group-hover:scale-125 transition-transform duration-500" />
                                            </Button>
                                            <Button variant="outline" className="md:w-64 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 py-10 h-auto rounded-[2rem] font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-lg">
                                                GET PDF NOTES <Download className="w-6 h-6 ml-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* SHARED STRATEGIC PLANNER SECTION */}
                <div className="mt-20 pt-12 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <section className="space-y-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center">
                                    <Calendar className="w-8 h-8 mr-3 text-amber-500" />
                                    Planner
                                </h2>
                                <p className="text-slate-500 font-medium">Strategic goals and daily coordination for the entire team.</p>
                            </div>
                            <Button
                                onClick={() => {
                                    setEditingEvent(null);
                                    setNewEvent({ title: "", description: "", color: "purple" });
                                    setIsAddEventOpen(true);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-8 py-6 h-auto shadow-xl shadow-blue-500/20 font-bold"
                            >
                                <Plus className="w-5 h-5 mr-2" /> Add New Note
                            </Button>
                        </div>

                        <Card className="border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-[3rem]">
                            <div className="grid md:grid-cols-12 gap-0 overflow-hidden">
                                {/* Sidebar Calendar */}
                                <div className="md:col-span-5 p-10 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-100 dark:border-slate-800 flex flex-col items-center justify-start">
                                    <CalendarComponent
                                        mode="single"
                                        selected={setlistDate}
                                        onSelect={setSetlistDate}
                                        className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl p-6 mx-auto scale-110 origin-top"
                                        modifiers={{
                                            hasEvent: (date) => calendarEvents.some(e => e.event_date === format(date, "yyyy-MM-dd"))
                                        }}
                                        modifiersStyles={{
                                            hasEvent: {
                                                fontWeight: 'bold',
                                                textDecoration: 'underline'
                                            }
                                        }}
                                        components={{
                                            DayContent: ({ date, ...props }) => {
                                                const dayEvents = calendarEvents.filter(e => e.event_date === format(date, "yyyy-MM-dd"));
                                                return (
                                                    <div className="relative w-full h-full flex items-center justify-center">
                                                        <span className="relative z-10">{date.getDate()}</span>
                                                        {dayEvents.length > 0 && (
                                                            <div className="absolute bottom-1 flex gap-0.5 justify-center w-full">
                                                                {dayEvents.slice(0, 3).map((e, i) => (
                                                                    <div
                                                                        key={i}
                                                                        className={cn(
                                                                            "w-1 h-1 rounded-full",
                                                                            e.color === 'purple' ? 'bg-purple-500' :
                                                                                e.color === 'blue' ? 'bg-blue-500' :
                                                                                    e.color === 'green' ? 'bg-green-500' :
                                                                                        e.color === 'orange' ? 'bg-orange-500' :
                                                                                            'bg-red-500'
                                                                        )}
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }
                                        }}
                                    />

                                    <div className="mt-12 space-y-6 w-full max-w-[280px]">
                                        <h4 className="text-xs font-black uppercase text-slate-600 dark:text-slate-300 tracking-[0.2em] text-center">Categories</h4>
                                        <div className="flex flex-wrap gap-3 justify-center">
                                            <button
                                                onClick={() => setSelectedCategory(selectedCategory === 'purple' ? null : 'purple')}
                                                className={cn(
                                                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all",
                                                    selectedCategory === 'purple'
                                                        ? "bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-500/20 scale-105"
                                                        : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-purple-300"
                                                )}
                                            >
                                                <div className={cn("w-2 h-2 rounded-full", selectedCategory === 'purple' ? "bg-white" : "bg-purple-500")} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Practice</span>
                                            </button>
                                            <button
                                                onClick={() => setSelectedCategory(selectedCategory === 'blue' ? null : 'blue')}
                                                className={cn(
                                                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all",
                                                    selectedCategory === 'blue'
                                                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105"
                                                        : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300"
                                                )}
                                            >
                                                <div className={cn("w-2 h-2 rounded-full", selectedCategory === 'blue' ? "bg-white" : "bg-blue-500")} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Event</span>
                                            </button>
                                            <button
                                                onClick={() => setSelectedCategory(selectedCategory === 'orange' ? null : 'orange')}
                                                className={cn(
                                                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all",
                                                    selectedCategory === 'orange'
                                                        ? "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-500/20 scale-105"
                                                        : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-orange-300"
                                                )}
                                            >
                                                <div className={cn("w-2 h-2 rounded-full", selectedCategory === 'orange' ? "bg-white" : "bg-orange-500")} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Urgent</span>
                                            </button>
                                            <button
                                                onClick={() => setSelectedCategory(selectedCategory === 'green' ? null : 'green')}
                                                className={cn(
                                                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all",
                                                    selectedCategory === 'green'
                                                        ? "bg-green-600 border-green-600 text-white shadow-lg shadow-green-500/20 scale-105"
                                                        : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-green-300"
                                                )}
                                            >
                                                <div className={cn("w-2 h-2 rounded-full", selectedCategory === 'green' ? "bg-white" : "bg-green-500")} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Notes</span>
                                            </button>
                                            <button
                                                onClick={() => setSelectedCategory(selectedCategory === 'red' ? null : 'red')}
                                                className={cn(
                                                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all",
                                                    selectedCategory === 'red'
                                                        ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-500/20 scale-105"
                                                        : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-red-300"
                                                )}
                                            >
                                                <div className={cn("w-2 h-2 rounded-full", selectedCategory === 'red' ? "bg-white" : "bg-red-500")} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Other</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Events Feed */}
                                <div className="md:col-span-7 p-10 flex flex-col h-full min-h-[600px] bg-white/40 dark:bg-slate-900/40">
                                    <div className="mb-10 flex justify-between items-end">
                                        <div>
                                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                                                {setlistDate ? format(setlistDate, "EEEE, MMMM do yyyy") : "Daily Schedule"}
                                            </h3>
                                            <p className="text-slate-400 font-bold text-[10px] mt-1 uppercase tracking-widest">
                                                {calendarEvents.filter(e => setlistDate && e.event_date === format(setlistDate, "yyyy-MM-dd") && (!selectedCategory || e.color === selectedCategory)).length > 0
                                                    ? `${calendarEvents.filter(e => setlistDate && e.event_date === format(setlistDate, "yyyy-MM-dd") && (!selectedCategory || e.color === selectedCategory)).length} Strategic Items`
                                                    : "Strategic Focus Clear"}
                                            </p>
                                        </div>
                                        <div className="text-right hidden sm:block">
                                            <Badge variant="outline" className="text-[10px] font-black tracking-[0.2em] uppercase border-slate-200 text-slate-400 px-3 py-1 rounded-full">
                                                Live TPH Planner
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="space-y-5 flex-1 overflow-y-auto pr-4 max-h-[500px] custom-scrollbar">
                                        {calendarEvents
                                            .filter(e => setlistDate && e.event_date === format(setlistDate, "yyyy-MM-dd") && (!selectedCategory || e.color === selectedCategory))
                                            .map(event => (
                                                <div
                                                    key={event.id}
                                                    className={cn(
                                                        "p-6 rounded-[2rem] shadow-sm transition-all group relative border border-transparent hover:shadow-xl hover:scale-[1.02]",
                                                        event.color === 'purple' ? 'bg-purple-50/50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-800/50' :
                                                            event.color === 'blue' ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/50' :
                                                                event.color === 'green' ? 'bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-800/50' :
                                                                    event.color === 'orange' ? 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800/50' :
                                                                        'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-800/50'
                                                    )}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex gap-5">
                                                            <div className={cn(
                                                                "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                                                                event.color === 'purple' ? 'bg-purple-600 text-white shadow-purple-500/30' :
                                                                    event.color === 'blue' ? 'bg-blue-600 text-white shadow-blue-500/30' :
                                                                        event.color === 'green' ? 'bg-green-600 text-white shadow-green-500/30' :
                                                                            event.color === 'orange' ? 'bg-orange-600 text-white shadow-orange-500/30' :
                                                                                'bg-red-600 text-white shadow-red-500/30'
                                                            )}>
                                                                <CalendarIcon className="w-7 h-7" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-black text-lg text-slate-800 dark:text-slate-100 group-hover:text-purple-600 transition-colors uppercase tracking-tight">{event.title}</h4>
                                                                {event.description && (
                                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-medium">
                                                                        {event.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-2 items-end">
                                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-9 w-9 rounded-xl bg-white dark:bg-slate-800 shadow-md hover:scale-110"
                                                                    onClick={() => {
                                                                        setEditingEvent(event);
                                                                        setNewEvent({
                                                                            title: event.title,
                                                                            description: event.description || "",
                                                                            color: event.color
                                                                        });
                                                                        setIsAddEventOpen(true);
                                                                    }}
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-9 w-9 rounded-xl bg-white dark:bg-slate-800 shadow-md hover:bg-red-50 hover:text-red-500 hover:scale-110"
                                                                    onClick={() => handleDeleteCalendarEvent(event.id)}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                            <span className="text-[10px] uppercase font-black text-slate-300 tracking-[0.2em] mt-2">
                                                                TPH COMMAND
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                        {calendarEvents.filter(e => setlistDate && e.event_date === format(setlistDate, "yyyy-MM-dd") && (!selectedCategory || e.color === selectedCategory)).length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                                                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mb-8 rotate-12 group-hover:rotate-0 transition-transform">
                                                    <Zap className="w-12 h-12 text-slate-300" />
                                                </div>
                                                <h4 className="text-slate-500 font-black uppercase tracking-[0.2em] text-lg">Operational Calm</h4>
                                                <p className="text-sm text-slate-400 mt-3 max-w-[280px] font-bold">The day is strategically clear. Ready for spontaneous inspiration!</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </section>
                </div>
            </div >

            {/* Dialogs for Instrumental Resources */}
            < Dialog open={isAddInstrOpen} onOpenChange={setIsAddInstrOpen} >
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add Instrumental Resource</DialogTitle>
                        <DialogDescription>Add a tutorial or technical guide for the band.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input placeholder="e.g. Advanced Piano Chords" value={newInstr.title} onChange={e => setNewInstr({ ...newInstr, title: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={newInstr.type} onValueChange={v => setNewInstr({ ...newInstr, type: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Tutorial">Tutorial</SelectItem>
                                    <SelectItem value="Technique">Technique</SelectItem>
                                    <SelectItem value="Resource">Resource</SelectItem>
                                    <SelectItem value="Workshop">Workshop</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>URL (YouTube/Link)</Label>
                            <Input placeholder="https://..." value={newInstr.url} onChange={e => setNewInstr({ ...newInstr, url: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleAddInstrResource} className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">Add Resource</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            <Dialog open={isEditInstrOpen} onOpenChange={setIsEditInstrOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Instrumental Resource</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input placeholder="e.g. Advanced Piano Chords" value={instrToEdit.title} onChange={e => setInstrToEdit({ ...instrToEdit, title: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={instrToEdit.type} onValueChange={v => setInstrToEdit({ ...instrToEdit, type: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Tutorial">Tutorial</SelectItem>
                                    <SelectItem value="Technique">Technique</SelectItem>
                                    <SelectItem value="Resource">Resource</SelectItem>
                                    <SelectItem value="Workshop">Workshop</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>URL (YouTube/Link)</Label>
                            <Input placeholder="https://..." value={instrToEdit.url} onChange={e => setInstrToEdit({ ...instrToEdit, url: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSaveEditInstrResource} className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
};

export default ChoirPage;
