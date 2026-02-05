import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AcademyDashboard } from "@/components/choir/AcademyDashboard";
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
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { format, startOfWeek, nextSaturday } from "date-fns";
import { cn } from "@/lib/utils";
import {
    Music, Mic, Calendar, ArrowLeft, Download, BookOpen, Users, Video, FileMusic, ListMusic, PlayCircle,
    Plus, PlusCircle, Trash2, Edit3, CheckCircle2,
    Play, Pause, Volume2, VolumeX, Maximize2, Minimize2,
    ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
    Search, Filter, SortAsc, LayoutGrid, List,
    Settings, LogOut, Loader2, Sparkles, Clapperboard, MonitorPlay, X,
    Folder,
    FolderOpen,
    MoreVertical,
    Pencil,
    Clock,
    Heart,
    Copy,
    Share2,
    Grid,
    List as ListIcon,
    CalendarIcon,
    Archive, Zap, Waves, GripVertical, RotateCcw, RotateCw, Check
} from "lucide-react";

import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { choirService, ChoirFolder, WeeklySetSong, ChoirCalendarEvent } from "@/services/choirService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useGlobalAudio } from "@/contexts/GlobalAudioContext";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    useDroppable
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const PRAYER_TEAM = ['Rekky', 'Pastor Deji', 'RP Zainab', 'YP Sodiq', 'Borja', 'Bro Kingsley', 'Min. Mercy', 'Min. Merit', 'Kido', 'Denise'];

interface PrayerStats {
    lastResetDate: string; // ISO string
    userStats: Record<string, {
        missedWeeks: number;
        lastWeekStatus: 'completed' | 'missed';
    }>;
}


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

const SortableSetSongCard = ({
    song,
    index,
    onPlay,
    onEdit,
    onRemove,
    onViewLyrics
}: {
    song: WeeklySetSong,
    index: number,
    onPlay: (url: string) => void,
    onEdit: (song: WeeklySetSong) => void,
    onRemove: (id: string) => void,
    onViewLyrics: (lyrics: string, title: string) => void
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: song.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center justify-between p-2 sm:p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl shadow-sm group"
        >
            <div className="flex items-center gap-2 sm:gap-3">
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-2 sm:p-3 -ml-1 sm:-ml-2 text-slate-300 hover:text-slate-500 transition-colors touch-none select-none">
                    <GripVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-blue-500 font-bold w-4 text-center text-xs sm:text-base">{index + 1}</span>
                <div className="min-w-0">
                    <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base line-clamp-1">
                        {song.title}
                        {song.url && (
                            <Badge
                                variant="secondary"
                                className="bg-blue-100 text-blue-700 cursor-pointer flex items-center gap-1.5 py-0.5 px-2 h-6 text-xs font-bold shrink-0 rounded-md shadow-sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onPlay(song.url!);
                                }}
                            >
                                <PlayCircle className="w-3 h-3" /> <span className="hidden sm:inline">Play</span>
                            </Badge>
                        )}
                        {song.lyrics && song.lyrics.trim() && (
                            <Badge
                                variant="secondary"
                                className="bg-purple-100 text-purple-700 cursor-pointer flex items-center gap-1.5 py-0.5 px-2 h-6 text-xs font-bold shrink-0 rounded-md shadow-sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onViewLyrics(song.lyrics!, song.title);
                                }}
                            >
                                <FileMusic className="w-3 h-3" /> <span className="hidden sm:inline">Lyrics</span>
                            </Badge>
                        )}
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-500 truncate max-w-[120px] sm:max-w-none">{song.artist}</p>
                </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {song.key && song.key.trim() && song.key !== '??' && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] sm:text-xs px-1.5 sm:px-2.5">
                        {song.key}
                    </Badge>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 text-slate-400 opacity-60 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => onEdit(song)}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => onRemove(song.id)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Remove
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
};

interface ScheduleItem {
    id: string;
    day: string;
    time: string;
    title: string;
    description: string;
    color?: string;
}

const DEFAULT_GALWAY_SCHEDULE: ScheduleItem[] = [
    {
        id: "1",
        day: "Thu",
        time: "6:00 PM",
        title: "Choir Practice",
        description: "Main weekly rehearsal. New songs are introduced here. Please verify keys and parts beforehand.",
        color: "purple"
    },
    {
        id: "2",
        day: "Fri",
        time: "5:40 PM",
        title: "Choir Practice",
        description: "Final run-through for Sunday service. Focused on transitions and flow.",
        color: "blue"
    },
    {
        id: "3",
        day: "Sun",
        time: "9:30 AM",
        title: "Soundcheck",
        description: "Mandatory soundcheck for all serving members. Please be on time.",
        color: "orange"
    }
];

const DEFAULT_GALWAY_PRAISE_ROSTER = ["Rekky", "Kido", "YP Sodiq", "Merit", "RP Zainab"];
const DEFAULT_GALWAY_PRAYER_ROSTER = ["Pastor Deji", "Rekky", "Kido", "YP Sodiq", "Merit", "RP Zainab"];

const AcademyCourseCard = ({ course, onAccess }: { course: any, onAccess: (course: any) => void }) => {
    return (
        <Card
            className="group overflow-hidden border-none shadow-xl bg-white dark:bg-slate-800 hover:shadow-2xl transition-all duration-500 rounded-[2rem] cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => onAccess(course)}
        >
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
                >
                    Access Course <PlayCircle className="w-4 h-4 ml-2" />
                </Button>
            </CardContent>
        </Card>
    );
};

const DroppableFolder = ({ id, children, onClick, onLongPress, className }: { id: string, children: React.ReactNode, onClick?: () => void, onLongPress?: () => void, className?: string }) => {
    const { isOver, setNodeRef } = useDroppable({
        id: id,
    });

    const [timer, setTimer] = useState<number | null>(null);

    const handleTouchStart = () => {
        if (onLongPress) {
            const timeout = window.setTimeout(() => {
                onLongPress();
            }, 600); // 600ms for long press
            setTimer(timeout);
        }
    };

    const handleTouchEnd = () => {
        if (timer) {
            window.clearTimeout(timer);
            setTimer(null);
        }
    };

    const handleTouchMove = () => {
        if (timer) {
            window.clearTimeout(timer);
            setTimer(null);
        }
    };

    return (
        <div
            ref={setNodeRef}
            onClick={onClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            className={cn(
                className,
                isOver ? "ring-2 ring-blue-500 bg-blue-50/80 dark:bg-blue-900/40 scale-[1.02] shadow-xl" : ""
            )}
        >
            {children}
        </div>
    );
};

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB for Supabase Free Plan

const ChoirPage = () => {
    // Inject Resource Hints for YouTube
    useEffect(() => {
        const domains = [
            'https://www.youtube-nocookie.com',
            'https://www.youtube.com',
            'https://www.google.com',
            'https://googleads.g.doubleclick.net',
            'https://static.doubleclick.net',
            'https://s.ytimg.com',
            'https://i.ytimg.com',
            'https://i9.ytimg.com',
            'https://fonts.googleapis.com',
            'https://fonts.gstatic.com',
        ];

        domains.forEach(domain => {
            // Preconnect
            const linkPreconnect = document.createElement('link');
            linkPreconnect.rel = 'preconnect';
            linkPreconnect.href = domain;
            document.head.appendChild(linkPreconnect);

            // DNS Prefetch
            const linkDns = document.createElement('link');
            linkDns.rel = 'dns-prefetch';
            linkDns.href = domain;
            document.head.appendChild(linkDns);
        });

        return () => {
            // Optional: Cleanup links if needed, though usually not necessary for performance links
        };
    }, []);

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
                    id: "vocal-harmony",
                    title: "Vocal Harmony & Blending",
                    category: "Performance",
                    duration: "3.5 Hours",
                    level: "All Levels",
                    description: "Learn the art of ear training to create seamless choral textures and perfect blend.",
                    image: "/assets/academy/vocal_harmony_uploaded_v2.jpg",
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
    const { locationId } = useParams(); // Get the location (galway, athlone, etc.)
    const [searchParams] = useSearchParams(); // Added for deep linking
    const { user } = useAuth();

    // Helper to get formatted location name
    const locationName = useMemo(() => {
        if (!locationId) return "Choir";
        return locationId.charAt(0).toUpperCase() + locationId.slice(1);
    }, [locationId]);

    const [activeTab, setActiveTab] = useState("vocalists");
    const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // ... (rest of states remain the same) ...
    // State for YouTube Player
    // State for Media Player (Video or Audio)
    const [currentMedia, setCurrentMedia] = useState<{ type: 'video' | 'audio', url: string, title?: string } | null>(null);

    // State for Setlist Date
    const [setlistDate, setSetlistDate] = useState<Date | undefined>(startOfWeek(new Date(), { weekStartsOn: 1 }));

    // State for Header Modals
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);
    const [isRosterOpen, setIsRosterOpen] = useState(false);

    // Dynamic Schedule State
    const [weeklySchedule, setWeeklySchedule] = useState<ScheduleItem[]>([]);
    const [isEditScheduleOpen, setIsEditScheduleOpen] = useState(false);
    const [newScheduleItem, setNewScheduleItem] = useState({ day: "", time: "", title: "", description: "", color: "blue" });
    const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

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
    const [learningSet, setLearningSet] = useState<WeeklySetSong[]>([]);

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
    const [isIdDialogOpen, setIsIdDialogOpen] = useState(false);
    const [isEditSongOpen, setIsEditSongOpen] = useState(false);
    const [isEditFolderOpen, setIsEditFolderOpen] = useState(false);
    const [folderToEdit, setFolderToEdit] = useState<{ id: string, name: string } | null>(null);
    const [editFolderName, setEditFolderName] = useState("");
    const [editingSongId, setEditingSongId] = useState<string | null>(null);
    const [songToEdit, setSongToEdit] = useState({ title: "", key: "", artist: "", url: "", notes: "" });

    // UI States for Setlist Management
    const [isAddToSetOpen, setIsAddToSetOpen] = useState(false);
    const [activeSetType, setActiveSetType] = useState<'praise' | 'worship' | 'learning' | null>(null);
    const [newSetSong, setNewSetSong] = useState<{ title: string, key: string, artist: string, url: string, lyrics?: string, library_song_id?: string }>({
        title: "",
        key: "",
        artist: "",
        url: "",
        lyrics: "",
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
        instrumental_notes: "",
        lyrics: ""
    });

    // UI States for Lyrics Prevention
    const [previewLyrics, setPreviewLyrics] = useState<{ title: string, content: string } | null>(null);
    const [isPreviewLyricsOpen, setIsPreviewLyricsOpen] = useState(false);

    // UI States for Import Setlist
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [importText, setImportText] = useState("");
    const [importSetType, setImportSetType] = useState<'praise' | 'worship' | 'learning' | null>(null);

    // UI States for Import Folder Songs
    const [isImportFolderOpen, setIsImportFolderOpen] = useState(false);
    const [importFolderText, setImportFolderText] = useState("");

    // UI States for Folder Options (Long Press)
    const [isFolderOptionsOpen, setIsFolderOptionsOpen] = useState(false);
    const [folderForOptions, setFolderForOptions] = useState<any>(null);

    // Saturday Prayer Accountability State
    const [prayerChecklist, setPrayerChecklist] = useState<Record<string, boolean>>({});
    const [isPrayerAccountabilityOpen, setIsPrayerAccountabilityOpen] = useState(false);

    const [prayerStats, setPrayerStats] = useState<PrayerStats>({ lastResetDate: new Date().toISOString(), userStats: {} });

    const togglePrayer = async (name: string) => {
        const newState = { ...prayerChecklist, [name]: !prayerChecklist[name] };
        setPrayerChecklist(newState); // Optimistic UI
        await choirService.updateSetlistInfo('prayer_checklist', JSON.stringify(newState), locationId!);
    };

    const checkWeeklyReset = async (checklist: Record<string, boolean>, currentStats: PrayerStats) => {
        const lastReset = new Date(currentStats.lastResetDate);
        const now = new Date();
        const nextSat = nextSaturday(lastReset);

        // If we have passed the next Saturday from the last reset date
        if (now > nextSat) {
            console.log("Processing Weekly Prayer Reset...");
            const newStats: PrayerStats = {
                lastResetDate: now.toISOString(), // Update reset date to now
                userStats: { ...currentStats.userStats }
            };

            PRAYER_TEAM.forEach(member => {
                const hasPrayed = checklist[member];
                const currentMemberStats = newStats.userStats[member] || { missedWeeks: 0, lastWeekStatus: 'completed' };

                if (!hasPrayed) {
                    newStats.userStats[member] = {
                        missedWeeks: currentMemberStats.missedWeeks + 1,
                        lastWeekStatus: 'missed'
                    };
                } else {
                    newStats.userStats[member] = {
                        missedWeeks: 0, // Reset streak if they prayed
                        lastWeekStatus: 'completed'
                    };
                }
            });

            // 1. Save new stats
            await choirService.updateSetlistInfo('prayer_accountability_stats', JSON.stringify(newStats), locationId!);

            // 2. Clear checklist
            const emptyChecklist = {};
            await choirService.updateSetlistInfo('prayer_checklist', JSON.stringify(emptyChecklist), locationId!);

            // 3. Update local state
            setPrayerStats(newStats);
            setPrayerChecklist(emptyChecklist);
            toast.info("A new week has started! Prayer checklist has been reset.");
        }
    };

    // Team Roster States
    const [praiseRoster, setPraiseRoster] = useState<string[]>([]);
    const [prayerRoster, setPrayerRoster] = useState<string[]>([]);
    const [isEditRosterMode, setIsEditRosterMode] = useState(false);
    const [newRosterName, setNewRosterName] = useState("");

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
    const [uploadingFile, setUploadingFile] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [vocalTrainingResources, setVocalTrainingResources] = useState<any[]>([]);
    const [isVocalTrainingUploadOpen, setIsVocalTrainingUploadOpen] = useState(false);
    const [newVocalTraining, setNewVocalTraining] = useState({ title: "" });
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);


    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handlePraiseDragEnd = (event: DragEndEvent) => handleDragEnd(event);
    const handleWorshipDragEnd = (event: DragEndEvent) => handleDragEnd(event);

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) return;

        // 1. Check if we dropped onto a folder
        if (over.id.toString().startsWith('folder-')) {
            const targetFolderId = over.id.toString().replace('folder-', '');

            // Find the song being dragged. It could be in praiseSet or worshipSet.
            let songToCopy: WeeklySetSong | undefined;

            songToCopy = praiseSet.find(s => s.id === active.id);
            if (!songToCopy) {
                songToCopy = worshipSet.find(s => s.id === active.id);
            }

            if (songToCopy) {
                try {
                    await choirService.addSongToFolder({
                        folder_id: targetFolderId,
                        title: songToCopy.title,
                        key: songToCopy.key || "",
                        artist: songToCopy.artist || "",
                        url: songToCopy.url || "",
                        notes: ""
                    }, locationId!);
                    toast.success(`Added "${songToCopy.title}" to folder`);
                } catch (e) {
                    console.error("Failed to copy song to folder:", e);
                    toast.error("Failed to add song to folder");
                }
            }
            return;
        }

        // 2. Existing Reordering Logic
        // Only proceed if active and over are different and NOT a folder drop
        if (active.id !== over.id) {
            // Determine set type
            let targetType: 'praise' | 'worship' | null = null;

            if (praiseSet.some(s => s.id === active.id)) targetType = 'praise';
            else if (worshipSet.some(s => s.id === active.id)) targetType = 'worship';

            if (!targetType) return;

            const set = targetType === 'praise' ? praiseSet : worshipSet;
            const setSetter = targetType === 'praise' ? setPraiseSet : setWorshipSet;

            const oldIndex = set.findIndex((song) => song.id === active.id);
            const newIndex = set.findIndex((song) => song.id === over.id);

            if (oldIndex === -1 || newIndex === -1) return;

            const newSet = arrayMove(set, oldIndex, newIndex);
            setSetter(newSet as any);

            try {
                // Update sort_order in DB
                const reorderData = newSet.map((song, index) => ({
                    id: song.id,
                    sort_order: index
                }));
                await choirService.reorderWeeklySet(reorderData);
                toast.success(`${targetType.charAt(0).toUpperCase() + targetType.slice(1)} order updated`);
            } catch (e) {
                console.error(e);
                toast.error("Failed to save new order");
            }
        }
    };

    // Initial Data Fetch
    useEffect(() => {
        const fetchData = async () => {
            if (!locationId) return;

            try {
                setLoading(true);
                const [fetchedFolders, fetchedPraise, fetchedWorship, fetchedLearning, fetchedInfo, fetchedInstr, fetchedEvents] = await Promise.all([
                    choirService.getFolders(locationId),
                    choirService.getWeeklySetlist('praise', locationId),
                    choirService.getWeeklySetlist('worship', locationId),
                    choirService.getLearningSongs(locationId),
                    choirService.getAllSetlistInfo(locationId),
                    choirService.getInstrumentalResources(locationId),
                    choirService.getCalendarEvents(locationId)
                ]);

                setFolders(fetchedFolders as any);
                setPraiseSet(fetchedPraise as any);
                setWorshipSet(fetchedWorship as any);
                setLearningSet(fetchedLearning as any);
                setInstrResources(fetchedInstr);
                setCalendarEvents(fetchedEvents);

                if (fetchedInfo['date']) {
                    const dbDate = new Date(fetchedInfo['date']);
                    const currentMonday = startOfWeek(new Date(), { weekStartsOn: 1 });

                    // 🚨 NEW WEEK DETECTION
                    if (currentMonday.getTime() > startOfWeek(dbDate, { weekStartsOn: 1 }).getTime()) {
                        console.log("New week detected! Clearing setlists...");
                        await choirService.clearWeeklySetlist(locationId);
                        await choirService.updateSetlistInfo('date', currentMonday.toISOString(), locationId);

                        // Clear Learning Songs for the new week (Monday)
                        await choirService.saveLearningSongs([], locationId);

                        // Clear old keys to prevent migration re-triggering
                        await choirService.updateSetlistInfo('learning_song_title', "", locationId);
                        await choirService.updateSetlistInfo('learning_song_url', "", locationId);

                        setSetlistDate(currentMonday);
                        setPraiseSet([]);
                        setWorshipSet([]);
                        setLearningSet([]);
                    } else {
                        setSetlistDate(dbDate);
                    }
                } else {
                    // Initialize week start if missing
                    const currentMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
                    await choirService.updateSetlistInfo('date', currentMonday.toISOString(), locationId);
                    setSetlistDate(currentMonday);
                }
                if (fetchedInfo['praise_desc']) setPraiseInfo(prev => ({ ...prev, desc: fetchedInfo['praise_desc'] }));
                if (fetchedInfo['worship_desc']) setWorshipInfo(prev => ({ ...prev, desc: fetchedInfo['worship_desc'] }));

                // MIGRATION CHECK: If old learning song exists but new set is empty, add it to new set
                if (fetchedInfo['learning_song_title'] && (!fetchedLearning || fetchedLearning.length === 0)) {
                    console.log("Migrating old learning focus...");
                    try {
                        const migratedSong: WeeklySetSong = {
                            id: crypto.randomUUID(),
                            set_type: 'praise', // JSON storage
                            title: fetchedInfo['learning_song_title'],
                            key: "",
                            artist: "",
                            url: fetchedInfo['learning_song_url'] || "",
                            sort_order: 0,
                            created_at: new Date().toISOString()
                        };
                        const newSet = [migratedSong];
                        await choirService.saveLearningSongs(newSet, locationId);
                        setLearningSet(newSet);

                        // Clear old keys to prevent re-migration
                        await choirService.updateSetlistInfo('learning_song_title', "", locationId);
                        await choirService.updateSetlistInfo('learning_song_url', "", locationId);
                    } catch (e) { console.error("Migration failed", e); }
                }

                // Fetch Weekly Schedule
                if (fetchedInfo['weekly_schedule']) {
                    try {
                        setWeeklySchedule(JSON.parse(fetchedInfo['weekly_schedule']));
                    } catch (e) {
                        console.error("Error parsing schedule:", e);
                        setWeeklySchedule(locationId === 'galway' ? DEFAULT_GALWAY_SCHEDULE : []);
                    }
                } else {
                    setWeeklySchedule(locationId === 'galway' ? DEFAULT_GALWAY_SCHEDULE : []);
                }

                // Fetch Praise Roster
                if (fetchedInfo['praise_roster']) {
                    try {
                        setPraiseRoster(JSON.parse(fetchedInfo['praise_roster']));
                    } catch (e) {
                        console.error("Error parsing praise roster:", e);
                        setPraiseRoster(locationId === 'galway' ? DEFAULT_GALWAY_PRAISE_ROSTER : []);
                    }
                } else {
                    setPraiseRoster(locationId === 'galway' ? DEFAULT_GALWAY_PRAISE_ROSTER : []);
                }

                // Fetch Prayer Roster
                if (fetchedInfo['prayer_roster']) {
                    try {
                        setPrayerRoster(JSON.parse(fetchedInfo['prayer_roster']));
                    } catch (e) {
                        console.error("Error parsing prayer roster:", e);
                        setPrayerRoster(locationId === 'galway' ? DEFAULT_GALWAY_PRAYER_ROSTER : []);
                    }
                } else {
                    setPrayerRoster(locationId === 'galway' ? DEFAULT_GALWAY_PRAYER_ROSTER : []);
                }

                // Fetch Prayer Checklist & Stats
                let currentChecklist: Record<string, boolean> = {};
                if (fetchedInfo['prayer_checklist']) {
                    try {
                        currentChecklist = JSON.parse(fetchedInfo['prayer_checklist']);
                        setPrayerChecklist(currentChecklist);
                    } catch (e) {
                        console.error("Error parsing prayer checklist:", e);
                    }
                }

                let currentStats: PrayerStats = { lastResetDate: new Date().toISOString(), userStats: {} };
                if (fetchedInfo['prayer_accountability_stats']) {
                    try {
                        currentStats = JSON.parse(fetchedInfo['prayer_accountability_stats']);
                        setPrayerStats(currentStats);
                    } catch (e) {
                        console.error("Error parsing prayer stats:", e);
                    }
                }

                // Trigger weekly reset check
                if (locationId === 'galway') {
                    checkWeeklyReset(currentChecklist, currentStats);
                }

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
            if (!locationId) return;
            const currentMonday = startOfWeek(new Date(), { weekStartsOn: 1 });

            setSetlistDate(prevDate => {
                if (!prevDate) return currentMonday;

                const prevMonday = startOfWeek(prevDate, { weekStartsOn: 1 });

                if (currentMonday.getTime() > prevMonday.getTime()) {
                    // Trigger async clearing in the background
                    (async () => {
                        console.log("Week transition detected in real-time! Clearing...");
                        await choirService.clearWeeklySetlist(locationId);
                        await choirService.updateSetlistInfo('date', currentMonday.toISOString(), locationId);
                        await choirService.updateSetlistInfo('learning_song_title', "", locationId);
                        await choirService.updateSetlistInfo('learning_song_url', "", locationId);
                        await choirService.updateSetlistInfo('prayer_checklist', '{}', locationId);
                        setPraiseSet([]);
                        setWorshipSet([]);
                        setLearningSet([]);
                        toast.info("New week started: Focus song and setlists cleared.");
                    })();
                    return currentMonday;
                }
                return prevDate;
            });
        }, 60000);

        return () => clearInterval(dateInterval);
    }, [locationId]);

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
                    const fetchedFolders = await choirService.getFolders(locationId!);
                    setFolders(fetchedFolders as any);
                } catch (error) {
                    console.error("Error refreshing folders:", error);
                }
            };
            refreshLibrary();
        }
    }, [isAddToSetOpen]);

    // 🔄 Real-time subscriptions for all choir data
    useEffect(() => {
        if (!locationId) return;

        const subscriptions: any[] = [];

        // 1. Subscribe to choir_folders
        const foldersChannel = supabase
            .channel('choir_folders_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'choir_folders',
                filter: `location=eq.${locationId}`
            }, async (payload) => {
                console.log('Folder change:', payload);

                if (payload.eventType === 'INSERT') {
                    const newFolder = payload.new as any;
                    setFolders(prev => {
                        if (prev.some(f => f.id === newFolder.id)) return prev;
                        return [...prev, { ...newFolder, songs: [] }] as any;
                    });
                } else if (payload.eventType === 'UPDATE') {
                    const updated = payload.new as any;
                    setFolders(prev => prev.map(f =>
                        f.id === updated.id ? { ...f, name: updated.name, parent_id: updated.parent_id } : f
                    ) as any);
                } else if (payload.eventType === 'DELETE') {
                    const deleted = payload.old as any;
                    setFolders(prev => prev.filter(f => f.id !== deleted.id) as any);
                }
            })
            .subscribe();

        subscriptions.push(foldersChannel);

        // 2. Subscribe to choir_songs
        const songsChannel = supabase
            .channel('choir_songs_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'choir_songs',

                filter: `location=eq.${locationId}`
            }, (payload) => {
                console.log('Song change (INSERT/UPDATE):', payload);

                if (payload.eventType === 'INSERT') {
                    const newSong = payload.new as any;
                    setFolders(prev => prev.map(f => {
                        if (f.id === newSong.folder_id) {
                            if (f.songs?.some(s => s.id === newSong.id)) return f;
                            return { ...f, songs: [...(f.songs || []), newSong] };
                        }
                        return f;
                    }) as any);
                } else if (payload.eventType === 'UPDATE') {
                    const updated = payload.new as any;
                    setFolders(prev => prev.map(f =>
                        f.id === updated.folder_id
                            ? { ...f, songs: (f.songs || []).map(s => s.id === updated.id ? updated : s) }
                            : f
                    ) as any);
                }
            })
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'choir_songs'
            }, (payload) => {
                console.log('Song change (DELETE):', payload);
                const deleted = payload.old as any;
                setFolders(prev => prev.map(f => ({
                    ...f,
                    songs: (f.songs || []).filter(s => s.id !== deleted.id)
                })) as any);
            })
            .subscribe();

        subscriptions.push(songsChannel);

        // 3. Subscribe to choir_weekly_set_songs
        const setlistChannel = supabase
            .channel('choir_weekly_set_songs_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'choir_weekly_set_songs',
                filter: `location=eq.${locationId}`
            }, (payload) => {
                console.log('Setlist change:', payload);

                if (payload.eventType === 'INSERT') {
                    const newSong = payload.new as any;
                    if (newSong.set_type === 'praise') {
                        setPraiseSet(prev => {
                            // Prevent duplicates by checking if song already exists
                            if (prev.some(s => s.id === newSong.id)) return prev;
                            return [...prev, newSong].sort((a, b) => a.sort_order - b.sort_order);
                        });
                    } else if (newSong.set_type === 'worship') {
                        setWorshipSet(prev => {
                            // Prevent duplicates by checking if song already exists
                            if (prev.some(s => s.id === newSong.id)) return prev;
                            return [...prev, newSong].sort((a, b) => a.sort_order - b.sort_order);
                        });
                    }
                } else if (payload.eventType === 'UPDATE') {
                    const updated = payload.new as any;
                    if (updated.set_type === 'praise') {
                        setPraiseSet(prev => prev.map(s => s.id === updated.id ? updated : s).sort((a, b) => a.sort_order - b.sort_order));
                    } else if (updated.set_type === 'worship') {
                        setWorshipSet(prev => prev.map(s => s.id === updated.id ? updated : s).sort((a, b) => a.sort_order - b.sort_order));
                    }
                } else if (payload.eventType === 'DELETE') {
                    const deleted = payload.old as any;
                    // Robust deletion handling with fallback for cases where set_type might be missing in older payloads
                    if (deleted.set_type === 'praise') {
                        setPraiseSet(prev => prev.filter(s => s.id !== deleted.id));
                    } else if (deleted.set_type === 'worship') {
                        setWorshipSet(prev => prev.filter(s => s.id !== deleted.id));
                    } else {
                        // Fallback: remove from both if set_type is unknown
                        setPraiseSet(prev => prev.filter(s => s.id !== deleted.id));
                        setWorshipSet(prev => prev.filter(s => s.id !== deleted.id));
                    }
                }
            })
            .subscribe();

        subscriptions.push(setlistChannel);

        // 4. Subscribe to choir_setlist_info (for date, descriptions, learning songs, schedules, rosters)
        const infoChannel = supabase
            .channel('choir_setlist_info_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'choir_setlist_info',
                filter: `location=eq.${locationId}`
            }, (payload) => {
                console.log('Setlist info change:', payload);

                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const info = payload.new as any;

                    switch (info.info_type) {
                        case 'date':
                            setSetlistDate(new Date(info.value));
                            break;
                        case 'praise_desc':
                            setPraiseInfo(prev => ({ ...prev, desc: info.value }));
                            break;
                        case 'worship_desc':
                            setWorshipInfo(prev => ({ ...prev, desc: info.value }));
                            break;
                        case 'learning_songs_json':
                            try {
                                const learningSongs = JSON.parse(info.value);
                                setLearningSet(learningSongs);
                            } catch (e) {
                                console.error('Failed to parse learning songs:', e);
                            }
                            break;
                        case 'prayer_checklist':
                            try {
                                const checklist = JSON.parse(info.value);
                                setPrayerChecklist(checklist);
                            } catch (e) {
                                console.error('Failed to parse prayer checklist:', e);
                            }
                            break;
                        case 'weekly_schedule':
                            try {
                                const schedule = JSON.parse(info.value);
                                setWeeklySchedule(schedule);
                            } catch (e) {
                                console.error('Failed to parse schedule:', e);
                            }
                            break;
                        case 'praise_roster':
                            try {
                                const roster = JSON.parse(info.value);
                                setPraiseRoster(roster);
                            } catch (e) {
                                console.error('Failed to parse praise roster:', e);
                            }
                            break;
                        case 'prayer_roster':
                            try {
                                const roster = JSON.parse(info.value);
                                setPrayerRoster(roster);
                            } catch (e) {
                                console.error('Failed to parse prayer roster:', e);
                            }
                            break;
                    }
                }
            })
            .subscribe();

        subscriptions.push(infoChannel);

        // 5. Subscribe to choir_instrumental_resources
        const instrChannel = supabase
            .channel('choir_instrumental_resources_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'choir_instrumental_resources',
                filter: `location=eq.${locationId}`
            }, (payload) => {
                console.log('Instrumental resource change:', payload);

                if (payload.eventType === 'INSERT') {
                    const newResource = payload.new as any;
                    setInstrResources(prev => {
                        if (prev.some(r => r.id === newResource.id)) return prev;
                        return [...prev, newResource];
                    });
                } else if (payload.eventType === 'UPDATE') {
                    const updated = payload.new as any;
                    setInstrResources(prev => prev.map(r => r.id === updated.id ? updated : r));
                } else if (payload.eventType === 'DELETE') {
                    const deleted = payload.old as any;
                    setInstrResources(prev => prev.filter(r => r.id !== deleted.id));
                }
            })
            .subscribe();

        subscriptions.push(instrChannel);

        // 6. Subscribe to choir_calendar_events
        const eventsChannel = supabase
            .channel('choir_calendar_events_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'choir_calendar_events',
                filter: `location=eq.${locationId}`
            }, (payload) => {
                console.log('Calendar event change:', payload);

                if (payload.eventType === 'INSERT') {
                    const newEvent = payload.new as any;
                    setCalendarEvents(prev => {
                        if (prev.some(e => e.id === newEvent.id)) return prev;
                        return [...prev, newEvent].sort((a, b) =>
                            new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
                        );
                    });
                } else if (payload.eventType === 'UPDATE') {
                    const updated = payload.new as any;
                    setCalendarEvents(prev => prev.map(e => e.id === updated.id ? updated : e).sort((a, b) =>
                        new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
                    ));
                } else if (payload.eventType === 'DELETE') {
                    const deleted = payload.old as any;
                    setCalendarEvents(prev => prev.filter(e => e.id !== deleted.id));
                }
            })
            .subscribe();

        subscriptions.push(eventsChannel);

        // Cleanup function
        return () => {
            console.log('Cleaning up choir real-time subscriptions');
            subscriptions.forEach(sub => {
                supabase.removeChannel(sub);
            });
        };
    }, [locationId]);



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
            await choirService.updateSetlistInfo(key, tempSetInfo.desc, locationId!);
            setIsEditSetInfoOpen(false);
            toast.success("Description updated");
        } catch (e) {
            console.error(e);
            toast.error("Failed to update description");
        }
    };

    const handleClearSetlist = async () => {
        if (!locationId) return;
        try {
            await Promise.all([
                choirService.clearWeeklySetlist(locationId),
                choirService.updateSetlistInfo('praise_desc', "", locationId),
                choirService.updateSetlistInfo('worship_desc', "", locationId),
                choirService.saveLearningSongs([], locationId) // Clear learning JSON
            ]);

            toast.success("New week started - setlists cleared");
        } catch (e) {
            console.error(e);
            toast.error("Failed to clear setlists");
        }
    };

    const handleArchiveSetlist = async () => {
        if (!locationId) return;
        if (praiseSet.length === 0 && worshipSet.length === 0) {
            toast.error("Setlists are empty - nothing to archive");
            return;
        }

        if (!window.confirm("Are you sure you want to archive this week's setlist? This creates a folder record of these songs.")) {
            return;
        }

        try {
            const dateStr = setlistDate ? format(setlistDate, "do 'of' MMMM") : 'Unknown Date';
            const folderName = `${dateStr} Song`;

            // Find or create "Previous Week's Setlist" parent folder
            const parentFolderName = "Previous Week's Setlist";
            let parentFolder = folders.find(f => f.name === parentFolderName && !f.parent_id);

            if (!parentFolder) {
                parentFolder = await choirService.createFolder(parentFolderName, locationId, null);
            }

            // Create dated folder under parent (instead of root)
            const mainFolder = await choirService.createFolder(folderName, locationId, parentFolder.id);

            // Create Praise Set subfolder
            const praiseFolder = await choirService.createFolder("Praise Set", locationId, mainFolder.id);

            // Create Worship Set subfolder
            const worshipFolder = await choirService.createFolder("Worship Set", locationId, mainFolder.id);

            const praisePromises = praiseSet.map(song =>
                choirService.addSongToFolder({
                    folder_id: praiseFolder.id,
                    title: song.title,
                    key: song.key,
                    artist: song.artist,
                    url: song.url,
                    notes: song.instrumental_notes || ''
                }, locationId)
            );

            const worshipPromises = worshipSet.map(song =>
                choirService.addSongToFolder({
                    folder_id: worshipFolder.id,
                    title: song.title,
                    key: song.key,
                    artist: song.artist,
                    url: song.url,
                    notes: song.instrumental_notes || ''
                }, locationId)
            );

            await Promise.all([...praisePromises, ...worshipPromises]);

            toast.success(`Archived to "${folderName}" in "${parentFolderName}"`);
        } catch (e) {
            console.error("Failed to archive setlist:", e);
            toast.error("Failed to archive setlist");
        }
    };

    // -- Handlers for Date --
    const handleDateSelect = async (date: Date | undefined) => {
        if (!date) return;
        try {
            const mondayOfSelectedWeek = startOfWeek(date, { weekStartsOn: 1 });
            await choirService.updateSetlistInfo('date', mondayOfSelectedWeek.toISOString(), locationId!);
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
            await choirService.createFolder(newFolderName, locationId!, activeFolderId);
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
            await choirService.addSongToFolder({
                folder_id: activeFolderId,
                title: newSong.title,
                key: newSong.key,
                artist: newSong.artist,
                url: newSong.url,
                notes: newSong.notes
            }, locationId!);

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
            if (activeFolderId === id) setActiveFolderId(null);
            toast.success("Folder deleted");
        } catch (e) {
            console.error(e);
            toast.error("Failed to delete folder");
        }
    };

    const handleUpdateFolder = async () => {
        if (!folderToEdit || !editFolderName.trim()) return;
        try {
            await choirService.updateFolder(folderToEdit.id, editFolderName);
            setIsEditFolderOpen(false);
            setFolderToEdit(null);
            setEditFolderName("");
            toast.success("Folder renamed");
        } catch (e) {
            console.error(e);
            toast.error("Failed to rename folder");
        }
    };

    const startEditFolder = (folder: any) => {
        setFolderToEdit({ id: folder.id, name: folder.name });
        setEditFolderName(folder.name);
        setIsEditFolderOpen(true);
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
            await choirService.updateSong(editingSongId, {
                title: songToEdit.title,
                key: songToEdit.key,
                artist: songToEdit.artist,
                url: songToEdit.url,
                notes: songToEdit.notes
            });

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
            toast.success("Song deleted");
        } catch (e) {
            console.error(e);
            toast.error("Failed to delete song");
        }
    };

    // -- Handlers for Setlists --
    const openAddSetSong = (type: 'praise' | 'worship' | 'learning') => {
        setActiveSetType(type);
        setNewSetSong({ title: "", key: "", artist: "", url: "" });
        setIsAddToSetOpen(true);
    };

    const handleAddSetSong = async () => {
        // Validation logic
        if (activeSetType === 'learning') {
            if (!newSetSong.url?.trim() && !newSetSong.title?.trim()) {
                toast.error("Please provide a Title or URL");
                return;
            }
        } else {
            if (!newSetSong.title.trim() || !activeSetType) return;
        }

        try {
            if (activeSetType === 'learning') {
                const newSong: WeeklySetSong = {
                    id: crypto.randomUUID(),
                    set_type: 'praise', // stored as JSON, type doesn't matter
                    title: newSetSong.title?.trim() || "",
                    key: newSetSong.key,
                    artist: newSetSong.artist,
                    url: newSetSong.url,
                    library_song_id: newSetSong.library_song_id,
                    sort_order: learningSet.length,
                    created_at: new Date().toISOString()
                };
                const updatedList = [...learningSet, newSong];
                await choirService.saveLearningSongs(updatedList, locationId!);
            } else {
                // Add song to database - real-time subscription will update the UI
                await choirService.addWeeklySong({
                    set_type: activeSetType,
                    title: newSetSong.title,
                    key: newSetSong.key,
                    artist: newSetSong.artist,
                    url: newSetSong.url,
                    library_song_id: newSetSong.library_song_id,
                    sort_order: activeSetType === 'praise' ? praiseSet.length : worshipSet.length
                }, locationId!);
                // Note: State update will happen via real-time subscription
            }

            setIsAddToSetOpen(false);
            setNewSetSong({ title: "", key: "", artist: "", url: "", lyrics: "", library_song_id: undefined });
        } catch (e) {
            console.error(e);
            toast.error("Failed to add song to setlist");
        }
    };

    const removeSetSong = async (type: 'praise' | 'worship' | 'learning', id: string) => {
        try {
            if (type === 'learning') {
                const updatedList = learningSet.filter(s => s.id !== id);
                await choirService.saveLearningSongs(updatedList, locationId!);
            } else {
                // Delete from database - real-time subscription will update the UI
                await choirService.deleteWeeklySong(id);
                // Note: State update will happen via real-time subscription
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to remove song");
        }
    };

    const clearSet = async (type: 'praise' | 'worship') => {
        const setName = type === 'praise' ? 'Praise Set' : 'Worship Set';
        const currentSet = type === 'praise' ? praiseSet : worshipSet;

        if (currentSet.length === 0) {
            toast.info(`${setName} is already empty`);
            return;
        }

        if (!window.confirm(`Are you sure you want to clear all ${currentSet.length} song(s) from ${setName}? This action cannot be undone.`)) {
            return;
        }

        try {
            // Delete all songs from the set
            const deletePromises = currentSet.map(song => choirService.deleteWeeklySong(song.id));
            await Promise.all(deletePromises);
            toast.success(`${setName} cleared successfully`);
        } catch (e) {
            console.error(e);
            toast.error(`Failed to clear ${setName}`);
        }
    };

    // -- Handlers for Edit Setlist Song --
    const startEditSetSong = (song: WeeklySetSong) => {
        // Map deprecated or JSON 'learning' type effectively
        // The song object from JSON has some set_type but implementation ignores it for JSON.
        // We need to know which list it came from to update correctly.
        // The edit dialog doesn't know the type implicitly unless we pass it or infer it.
        // However, startEditSetSong just sets state.
        // We will infer modification target by checking which list contains the ID in handleSaveEditSong
        setEditingSetSongId(song.id);
        setEditingSetlistSongData({
            title: song.title,
            key: song.key,
            artist: song.artist,
            url: song.url || "",
            instrumental_url: song.instrumental_url || "",
            instrumental_notes: song.instrumental_notes || "",
            lyrics: song.lyrics || ""
        });
        setIsEditSetSongOpen(true);
    };

    const handleSaveEditSetSong = async () => {
        // Determine if it's in learning set
        const isLearning = learningSet.find(s => s.id === editingSetSongId);

        if (!editingSetSongId || (!isLearning && !editingSetlistSongData.title.trim())) return;

        try {

            if (isLearning) {
                const updatedList = learningSet.map(s => {
                    if (s.id === editingSetSongId) {
                        return {
                            ...s,
                            title: editingSetlistSongData.title,
                            key: editingSetlistSongData.key,
                            artist: editingSetlistSongData.artist,
                            url: editingSetlistSongData.url,
                            instrumental_url: editingSetlistSongData.instrumental_url,
                            instrumental_notes: editingSetlistSongData.instrumental_notes,
                            lyrics: editingSetlistSongData.lyrics
                        };
                    }
                    return s;
                });
                await choirService.saveLearningSongs(updatedList, locationId!);
            } else {
                // Must be Praise or Worship (DB)
                await choirService.updateWeeklySong(editingSetSongId, {
                    title: editingSetlistSongData.title,
                    key: editingSetlistSongData.key,
                    artist: editingSetlistSongData.artist,
                    url: editingSetlistSongData.url,
                    instrumental_url: editingSetlistSongData.instrumental_url,
                    instrumental_notes: editingSetlistSongData.instrumental_notes,
                    lyrics: editingSetlistSongData.lyrics
                });
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

        let matchedCount = 0;

        try {
            if (importSetType === 'learning') {
                const newSongs: WeeklySetSong[] = lines.map((line, index) => {
                    const match = allLibrarySongs.find(s => s.title.toLowerCase() === line.toLowerCase());
                    if (match) matchedCount++;
                    return match ? {
                        id: crypto.randomUUID(),
                        set_type: 'praise' as const, // JSON, type ignored
                        title: match.title,
                        key: match.key,
                        artist: match.artist || "",
                        url: match.url || "",
                        library_song_id: match.id,
                        sort_order: learningSet.length + index,
                        created_at: new Date().toISOString()
                    } : {
                        id: crypto.randomUUID(),
                        set_type: 'praise' as const,
                        title: line,
                        key: "??",
                        artist: "",
                        url: "",
                        sort_order: learningSet.length + index,
                        created_at: new Date().toISOString()
                    };
                });

                const updatedList = [...learningSet, ...newSongs];
                await choirService.saveLearningSongs(updatedList, locationId!);
                setLearningSet(updatedList);

                setIsImportOpen(false);
                setImportText("");
                toast.success(`Imported ${newSongs.length} songs to Learning Focus (${matchedCount} matched)`);
            } else {
                const results = await Promise.all(lines.map(async (line, idx) => {
                    const match = allLibrarySongs.find(s => s.title.toLowerCase() === line.toLowerCase());
                    const currentSetLength = importSetType === 'praise' ? praiseSet.length : worshipSet.length;
                    const songData = match ? {
                        set_type: importSetType as 'praise' | 'worship',
                        title: match.title,
                        key: match.key,
                        artist: match.artist || "",
                        url: match.url || "",
                        library_song_id: match.id,
                        sort_order: currentSetLength + idx
                    } : {
                        set_type: importSetType as 'praise' | 'worship',
                        title: line,
                        key: "??",
                        artist: "",
                        url: "",
                        sort_order: currentSetLength + idx
                    };
                    if (match) matchedCount++;
                    return choirService.addWeeklySong(songData, locationId!);
                }));

                const newSongs = results as unknown as WeeklySetSong[];

                setIsImportOpen(false);
                setImportText("");
                toast.success(`Imported ${newSongs.length} songs (${matchedCount} matched from library)`);
            }
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
                if (!locationId) return null;
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
                }, locationId);
            }));

            setIsImportFolderOpen(false);
            setImportFolderText("");
            toast.success(`Imported ${lines.length} songs to folder (${matchedCount} details matched)`);
        } catch (e) {
            console.error(e);
            toast.error("Failed to import songs to folder");
        }
    };

    const uploadToR2 = async (file: File): Promise<{ publicUrl: string; key: string }> => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not logged in");

        console.log(`[R2] Starting upload for ${file.name} (${file.size} bytes)`);

        const response = await supabase.functions.invoke('get-r2-upload-url', {
            body: { fileName: file.name, fileType: file.type }
        });

        if (response.error) {
            console.error("[R2] Failed to get signed URL", response.error);
            throw new Error(response.error.message || "Failed to get upload URL");
        }
        const { uploadUrl, publicUrl, key } = response.data;
        console.log("[R2] Received signed URL. Starting direct transfer.");

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.withCredentials = false;

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    // Capping at 99% to allow room for "Finalizing" state
                    const percentComplete = Math.round((e.loaded / e.total) * 99);
                    setUploadProgress(percentComplete);
                }
            });

            xhr.addEventListener('load', () => {
                console.log(`[R2] Server response: ${xhr.status} ${xhr.statusText}`);
                if (xhr.status >= 200 && xhr.status < 300) {
                    setUploadProgress(100);
                    resolve({ publicUrl, key });
                } else {
                    reject(new Error(`Cloudflare upload failed: ${xhr.statusText} (${xhr.status})`));
                }
            });

            xhr.addEventListener('error', () => {
                console.error("[R2] Network error during upload");
                reject(new Error('Cloudflare upload failed (Network Error)'));
            });

            xhr.addEventListener('timeout', () => {
                console.error("[R2] Upload timed out");
                reject(new Error('Cloudflare upload timed out'));
            });

            xhr.open('PUT', uploadUrl);
            xhr.timeout = 15 * 60 * 1000; // 15 minutes for large files
            xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
            xhr.send(file);
        });
    };

    // -- Handlers for Instrumental Resources --
    const handleAddInstrResource = async () => {
        if (!newInstr.title.trim()) return;

        setUploadingFile(true);
        setUploadProgress(0);
        try {
            let fileUrl = newInstr.url;

            // All files now go to Cloudflare R2
            if (selectedFile) {
                const { publicUrl } = await uploadToR2(selectedFile);
                fileUrl = publicUrl;

                console.log("[R2] Upload steps finished. Registering resource in database.");
                await choirService.addInstrumentalResource({ ...newInstr, url: fileUrl }, locationId!);
                console.log("[R2] Final successfully registered.");
            } else if (newInstr.url) {
                // Manually entered URL
                await choirService.addInstrumentalResource({ ...newInstr, url: newInstr.url }, locationId!);
            }
            console.log("[R2] Final successfully registered.");
            setNewInstr({ title: "", type: "Tutorial", url: "" });
            setSelectedFile(null);
            setUploadProgress(null);
            setIsAddInstrOpen(false);
            toast.success("Resource added successfully");
        } catch (e) {
            console.error(e);
            toast.error("Failed to add resource");
            setUploadProgress(null);
        } finally {
            setUploadingFile(false);
        }
    };

    const handleAddVocalTraining = async () => {
        if (!newVocalTraining.title.trim() || !selectedFile) {
            toast.error("Please provide a title and select a file");
            return;
        }

        setUploadingFile(true);
        setUploadProgress(0);
        try {
            let fileUrl = "";

            // All files now go to Cloudflare R2
            const { publicUrl } = await uploadToR2(selectedFile);
            fileUrl = publicUrl;

            console.log("[R2] Upload steps finished. Registering vocal training in database.");
            await choirService.addInstrumentalResource({
                title: newVocalTraining.title,
                type: 'Academy: vocal-101',
                url: fileUrl
            }, locationId!);
            console.log("[R2] Final successfully registered.");

            setNewVocalTraining({ title: "" });
            setSelectedFile(null);
            setUploadProgress(null);
            setIsVocalTrainingUploadOpen(false);
            toast.success("Vocal training audio added successfully");
        } catch (e) {
            console.error(e);
            toast.error("Failed to upload vocal training audio");
            setUploadProgress(null);
        } finally {
            setUploadingFile(false);
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
            await choirService.updateInstrumentalResource(editingInstrId, instrToEdit);
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
            toast.success("Resource deleted");
        } catch (e) {
            console.error(e);
            toast.error("Failed to delete resource");
        }
    };

    const handleUpdateBandDetails = async (songId: string, updates: { instrumental_url?: string, instrumental_notes?: string }) => {
        try {
            await choirService.updateWeeklySong(songId, updates);
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
            }, locationId!);
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
            toast.success("Event deleted");
        } catch (e) {
            console.error(e);
            toast.error("Failed to delete event");
        }
    };

    // -- Handlers for Learning Focus --
    // -- Handlers for Weekly Schedule --
    const handleSaveSchedule = async (updatedSchedule: ScheduleItem[]) => {
        if (!locationId) return;
        try {
            await choirService.updateSetlistInfo('weekly_schedule', JSON.stringify(updatedSchedule), locationId);
            toast.success("Schedule updated successfully");
        } catch (e) {
            console.error(e);
            toast.error("Failed to save schedule");
        }
    };

    const handleAddScheduleItem = async () => {
        if (!newScheduleItem.day || !newScheduleItem.title || !newScheduleItem.time) {
            toast.error("Please fill in Day, Time, and Title");
            return;
        }

        const newItem: ScheduleItem = {
            id: crypto.randomUUID(),
            ...newScheduleItem
        };

        const updatedSchedule = [...weeklySchedule, newItem];
        await handleSaveSchedule(updatedSchedule);
        setNewScheduleItem({ day: "", time: "", title: "", description: "", color: "blue" });
        setIsEditScheduleOpen(false);
    };

    const handleDeleteScheduleItem = async (id: string) => {
        const updatedSchedule = weeklySchedule.filter(item => item.id !== id);
        await handleSaveSchedule(updatedSchedule);
    };

    const handleUpdateScheduleItem = async () => {
        if (!editingScheduleId) return;
        const updatedSchedule = weeklySchedule.map(item =>
            item.id === editingScheduleId ? { ...item, ...newScheduleItem } : item
        );
        await handleSaveSchedule(updatedSchedule);
        setEditingScheduleId(null);
        setNewScheduleItem({ day: "", time: "", title: "", description: "", color: "blue" });
        setIsEditScheduleOpen(false);
    };

    const startEditScheduleItem = (item: ScheduleItem) => {
        setEditingScheduleId(item.id);
        setNewScheduleItem({
            day: item.day,
            time: item.time,
            title: item.title,
            description: item.description,
            color: item.color || "blue"
        });
        setIsEditScheduleOpen(true);
    };

    // -- Handlers for Team Roster --
    const handleSaveRoster = async (rosterType: 'praise' | 'prayer', updatedRoster: string[]) => {
        if (!locationId) return;
        try {
            const infoKey = rosterType === 'praise' ? 'praise_roster' : 'prayer_roster';
            await choirService.updateSetlistInfo(infoKey, JSON.stringify(updatedRoster), locationId);
            toast.success("Roster updated");
        } catch (e) {
            console.error(e);
            toast.error("Failed to save roster");
        }
    };

    const handleAddRosterMember = (rosterType: 'praise' | 'prayer') => {
        if (!newRosterName.trim()) return;
        const currentRoster = rosterType === 'praise' ? praiseRoster : prayerRoster;
        const updatedRoster = [...currentRoster, newRosterName.trim()];
        handleSaveRoster(rosterType, updatedRoster);
        setNewRosterName("");
    };

    const { playTrack, pause, resume, seek, setIsMiniPlayerHidden, audioState } = useGlobalAudio();

    const handleRemoveRosterMember = (rosterType: 'praise' | 'prayer', index: number) => {
        const currentRoster = rosterType === 'praise' ? praiseRoster : prayerRoster;
        const updatedRoster = currentRoster.filter((_, i) => i !== index);
        handleSaveRoster(rosterType, updatedRoster);
    };

    const playVideo = (url: string, title?: string) => {
        try {
            const videoId = extractYoutubeId(url);
            if (videoId) {
                setCurrentMedia({
                    type: 'video',
                    url: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`,
                    title: title || 'Video Player'
                });
            } else {
                // Play audio globally (background supported)
                playTrack(url, title || "Audio Track", "Backing Track");
                // Open local modal AND hide mini player
                setIsMiniPlayerHidden(true);
                setCurrentMedia({
                    type: 'audio',
                    url: url,
                    title: title || 'Audio Player'
                });
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

            {/* Choir Schedule Modal */}
            <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
                <DialogContent className="w-full h-full max-w-none m-0 rounded-none flex flex-col p-0 bg-white dark:bg-slate-900 overflow-hidden [&>button]:!top-[calc(1.5rem+env(safe-area-inset-top,0px))] [&>button]:!right-6">
                    <DialogHeader className="p-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
                            <CalendarIcon className="w-6 h-6 text-blue-600" />
                            Choir Schedule
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            View and manage the weekly choir rehearsal and event schedule.
                        </DialogDescription>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:bg-blue-50 font-bold mr-12"
                            onClick={() => {
                                setEditingScheduleId(null);
                                setNewScheduleItem({ day: "", time: "", title: "", description: "", color: "blue" });
                                setIsEditScheduleOpen(true);
                            }}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Item
                        </Button>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-6 space-y-6 px-4 md:px-20 max-w-4xl mx-auto w-full">
                        {weeklySchedule.length > 0 ? (
                            weeklySchedule.map((item) => (
                                <div
                                    key={item.id}
                                    className={cn(
                                        "p-5 rounded-3xl flex gap-4 items-start border transition-all group relative",
                                        item.color === 'purple' ? "bg-purple-50/50 dark:bg-purple-900/10 border-purple-100/50 dark:border-purple-800/30" :
                                            item.color === 'blue' ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-100/50 dark:border-blue-800/30" :
                                                item.color === 'orange' ? "bg-orange-50/50 dark:bg-orange-900/10 border-orange-100/50 dark:border-orange-800/30" :
                                                    item.color === 'green' ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100/50 dark:border-emerald-800/30" :
                                                        "bg-slate-50/50 dark:bg-slate-900/10 border-slate-100/50 dark:border-slate-800/30"
                                    )}
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                                        item.color === 'purple' ? "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400" :
                                            item.color === 'blue' ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400" :
                                                item.color === 'orange' ? "bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400" :
                                                    item.color === 'green' ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400" :
                                                        "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                    )}>
                                        <span className="font-bold text-sm uppercase">{item.day}</span>
                                    </div>
                                    <div className="space-y-1 flex-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{item.title}</h3>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => startEditScheduleItem(item)}>
                                                    <Edit3 className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => handleDeleteScheduleItem(item.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <p className={cn(
                                            "text-lg font-bold",
                                            item.color === 'purple' ? "text-purple-600 dark:text-purple-400" :
                                                item.color === 'blue' ? "text-blue-600 dark:text-blue-400" :
                                                    item.color === 'orange' ? "text-orange-600 dark:text-orange-400" :
                                                        item.color === 'green' ? "text-emerald-600 dark:text-emerald-400" :
                                                            "text-slate-600 dark:text-slate-400"
                                        )}>{item.time}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed pt-1 whitespace-pre-wrap">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20 space-y-4">
                                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
                                    <CalendarIcon className="w-10 h-10" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xl font-bold text-slate-900 dark:text-white">No Schedule Set</p>
                                    <p className="text-slate-500 max-w-xs mx-auto text-sm">Tap the "Add Item" button to start building your choir's weekly schedule.</p>
                                </div>
                            </div>
                        )}
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



            {/* Edit Schedule Item Dialog */}
            <Dialog open={isEditScheduleOpen} onOpenChange={setIsEditScheduleOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingScheduleId ? 'Edit Schedule Item' : 'Add Schedule Item'}</DialogTitle>
                        <DialogDescription>
                            {editingScheduleId ? 'Update the details for this schedule item.' : 'Add a new rehearsal or event to the weekly schedule.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Day (e.g. Thu)</Label>
                                <Input
                                    placeholder="Thu"
                                    value={newScheduleItem.day}
                                    onChange={(e) => setNewScheduleItem({ ...newScheduleItem, day: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Time (e.g. 6:00 PM)</Label>
                                <Input
                                    placeholder="6:00 PM"
                                    value={newScheduleItem.time}
                                    onChange={(e) => setNewScheduleItem({ ...newScheduleItem, time: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                                placeholder="Choir Practice"
                                value={newScheduleItem.title}
                                onChange={(e) => setNewScheduleItem({ ...newScheduleItem, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description (Optional)</Label>
                            <Textarea
                                placeholder="Details about this rehearsal..."
                                value={newScheduleItem.description}
                                onChange={(e) => setNewScheduleItem({ ...newScheduleItem, description: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Color Coordinator</Label>
                            <div className="grid grid-cols-5 gap-2">
                                {[
                                    { name: 'purple', bg: 'bg-purple-500' },
                                    { name: 'blue', bg: 'bg-blue-500' },
                                    { name: 'orange', bg: 'bg-orange-500' },
                                    { name: 'green', bg: 'bg-emerald-500' },
                                    { name: 'gray', bg: 'bg-slate-500' },
                                ].map((c) => (
                                    <button
                                        key={c.name}
                                        type="button"
                                        className={cn(
                                            "h-8 rounded-lg border-2 transition-all",
                                            newScheduleItem.color === c.name ? "border-slate-900 dark:border-white scale-110" : "border-transparent"
                                        )}
                                        onClick={() => setNewScheduleItem({ ...newScheduleItem, color: c.name })}
                                    >
                                        <div className={cn("w-full h-full rounded-md", c.bg)} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditScheduleOpen(false)}>Cancel</Button>
                        <Button
                            onClick={editingScheduleId ? handleUpdateScheduleItem : handleAddScheduleItem}
                            className="bg-blue-600 text-white"
                        >
                            {editingScheduleId ? 'Update Item' : 'Add Item'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add / Edit Event Dialog */}
            <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
                <DialogContent className="w-full h-full max-w-none m-0 rounded-none flex flex-col p-0 bg-white dark:bg-slate-900 overflow-hidden [&>button]:!top-[calc(1.5rem+env(safe-area-inset-top,0px))] [&>button]:!right-6">
                    <DialogHeader className="p-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
                            <CalendarIcon className="w-6 h-6 text-blue-600" />
                            {editingEvent ? 'Edit Calendar Note' : 'Add Calendar Note'}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {editingEvent ? 'Update this planner note.' : 'Create a new strategy or note for the team planner.'}
                        </DialogDescription>
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
            <Dialog open={isRosterOpen} onOpenChange={(open) => {
                setIsRosterOpen(open);
                if (!open) setIsEditRosterMode(false);
            }}>
                <DialogContent className="w-full h-full max-w-none m-0 rounded-none flex flex-col p-0 bg-white dark:bg-slate-900 overflow-hidden [&>button]:!top-[calc(1.5rem+env(safe-area-inset-top,0px))] [&>button]:!right-6">
                    <DialogHeader className="p-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
                            <Users className="w-6 h-6 text-blue-600" />
                            Team Roster
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            View the current roster for Praise & Worship and Tuesday Prayer teams.
                        </DialogDescription>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:bg-blue-50 font-bold mr-12"
                            onClick={() => setIsEditRosterMode(!isEditRosterMode)}
                        >
                            <Edit3 className="w-4 h-4 mr-2" />
                            {isEditRosterMode ? 'Finish Editing' : 'Edit Roster'}
                        </Button>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-8 space-y-12 px-4 md:px-20 max-w-4xl mx-auto w-full">

                        {/* Praise & Worship Roster */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b border-purple-100 dark:border-purple-800 pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-xl text-purple-600">
                                        <Mic className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Praise & Worship</h3>
                                </div>
                            </div>

                            {isEditRosterMode && (
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Add name..."
                                        value={newRosterName}
                                        onChange={(e) => setNewRosterName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddRosterMember('praise')}
                                        className="rounded-xl border-blue-100 focus:ring-blue-500 h-12"
                                    />
                                    <Button onClick={() => handleAddRosterMember('praise')} className="bg-blue-600 rounded-xl h-12 px-6">
                                        <Plus className="w-5 h-5" />
                                    </Button>
                                </div>
                            )}

                            <div className="grid gap-3">
                                {praiseRoster.length > 0 ? (
                                    praiseRoster.map((name, i) => (
                                        <div key={i} className="flex items-center justify-between p-5 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                                            <div className="flex items-center gap-5">
                                                <span className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-black">
                                                    {i + 1}
                                                </span>
                                                <span className="font-bold text-lg text-slate-700 dark:text-slate-200">{name}</span>
                                            </div>
                                            {isEditRosterMode && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-10 w-10 text-rose-600 hover:bg-rose-50 rounded-full"
                                                    onClick={() => handleRemoveRosterMember('praise', i)}
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </Button>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center py-8 text-slate-400 italic bg-slate-50 dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                        No members added to this list yet.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Prayer Roster - Only for Galway */}
                        {locationId === 'galway' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-800 pb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600">
                                            <Calendar className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Tuesday Prayer</h3>
                                            <p className="text-sm text-blue-600 font-bold uppercase tracking-wider">5:30 PM • Zoom</p>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 rounded-xl font-bold"
                                        onClick={() => window.open("https://us04web.zoom.us/j/77218043569?pwd=6Aj4q1LLCjKio3x7HMod2tStiH0g7s.1", "_blank")}
                                    >
                                        <Video className="w-4 h-4 mr-2" />
                                        Join Zoom
                                    </Button>
                                </div>

                                {isEditRosterMode && (
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Add name..."
                                            value={newRosterName}
                                            onChange={(e) => setNewRosterName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddRosterMember('prayer')}
                                            className="rounded-xl border-blue-100 focus:ring-blue-500 h-12"
                                        />
                                        <Button onClick={() => handleAddRosterMember('prayer')} className="bg-blue-600 rounded-xl h-12 px-6">
                                            <Plus className="w-5 h-5" />
                                        </Button>
                                    </div>
                                )}

                                <div className="grid gap-3">
                                    {prayerRoster.length > 0 ? (
                                        prayerRoster.map((name, i) => (
                                            <div key={i} className="flex items-center justify-between p-5 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                                                <div className="flex items-center gap-5">
                                                    <span className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-black">
                                                        {i + 1}
                                                    </span>
                                                    <span className="font-bold text-lg text-slate-700 dark:text-slate-200">{name}</span>
                                                </div>
                                                {isEditRosterMode && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-10 w-10 text-rose-600 hover:bg-rose-50 rounded-full"
                                                        onClick={() => handleRemoveRosterMember('prayer', i)}
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center py-8 text-slate-400 italic bg-slate-50 dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                            No members added to this list yet.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                    <div className="p-8 md:px-20 max-w-4xl mx-auto w-full">
                        <Button
                            onClick={() => setIsRosterOpen(false)}
                            className="w-full bg-slate-900 hover:bg-black text-white rounded-2xl py-6 text-lg font-bold shadow-xl transition-all"
                        >
                            Close Roster
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Setlist Info Dialog */}
            <Dialog open={isEditSetInfoOpen} onOpenChange={setIsEditSetInfoOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit {editingSetInfoType === 'praise' ? 'Praise' : 'Worship'} Description</DialogTitle>
                        <DialogDescription>
                            Update the subtitle or BPM for this section of the setlist.
                        </DialogDescription>
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
            <Dialog open={isAddToSetOpen} onOpenChange={setIsAddToSetOpen}>
                <DialogContent className="w-full h-full max-w-none m-0 rounded-none flex flex-col p-0 bg-white dark:bg-slate-900 overflow-hidden [&>button]:!top-[calc(1.5rem+env(safe-area-inset-top,0px))] [&>button]:!right-6">
                    <DialogHeader className="p-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] border-b border-slate-100 dark:border-slate-800">
                        <DialogTitle className="text-xl font-bold">
                            {activeSetType === 'learning' ? 'Add Learning Focus Song' : `Add to ${activeSetType === 'praise' ? 'Praise' : 'Worship'} Set`}
                        </DialogTitle>
                        <DialogDescription>
                            Enter the details of the song you want to add to the setlist.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-8 px-4 md:px-20 max-w-4xl mx-auto w-full space-y-6">
                        {activeSetType !== 'learning' && (
                            <>
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
                            </>
                        )}

                        <div className="space-y-2">
                            <Label>Song Title {activeSetType === 'learning' ? '(Optional)' : ''}</Label>
                            <Input
                                placeholder={activeSetType === 'learning' ? "e.g. Goodness of God" : "e.g. Way Maker"}
                                value={newSetSong.title}
                                onChange={(e) => setNewSetSong({ ...newSetSong, title: e.target.value, library_song_id: undefined })}
                            />
                        </div>

                        {activeSetType !== 'learning' && (
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
                        )}
                        <div className="space-y-2">
                            <Label>Youtube video URL {activeSetType === 'learning' ? <span className="text-red-500">*</span> : "(Optional)"}</Label>
                            <Input
                                placeholder="https://youtube.com/..."
                                value={newSetSong.url}
                                onChange={(e) => setNewSetSong({ ...newSetSong, url: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Lyrics</Label>
                            <Textarea
                                placeholder="Paste lyrics here..."
                                className="min-h-[150px] font-sans"
                                value={newSetSong.lyrics || ""}
                                onChange={(e) => setNewSetSong({ ...newSetSong, lyrics: e.target.value })}
                            />
                        </div>

                        <div className="pt-4">
                            <Button onClick={handleAddSetSong} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-bold rounded-2xl shadow-lg transition-all">
                                Add to Set
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog >

            {/* Import Setlist Dialog */}
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                <DialogContent
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    className="w-full h-full max-w-none m-0 rounded-none flex flex-col p-0 bg-white dark:bg-slate-900 overflow-hidden [&>button]:!top-[calc(1.5rem+env(safe-area-inset-top,0px))] [&>button]:!right-6"
                >
                    <DialogHeader className="p-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] border-b border-slate-100 dark:border-slate-800">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
                            <Download className="w-6 h-6 text-blue-600" />
                            Import from Notes
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Paste a list of songs to import them into your setlist.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-6 px-4 md:px-20 max-w-4xl mx-auto w-full">
                        <div className="space-y-4">
                            <p className="text-slate-500 dark:text-slate-400 font-medium">
                                Paste a list of songs from your notes app (one song per line). We'll try to find matches in your library.
                            </p>
                            <Textarea
                                placeholder="Way Maker&#10;Goodness of God&#10;Agnes Dei"
                                className="min-h-[400px] font-mono text-base p-4 rounded-2xl border-purple-100 dark:border-purple-800/50 focus-visible:ring-purple-500 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 shadow-sm"
                                value={importText}
                                onChange={(e) => setImportText(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="p-6 md:px-20 border-t border-slate-100 dark:border-slate-800 max-w-4xl mx-auto w-full">
                        <div className="flex flex-col sm:flex-row gap-4 pb-4">
                            <Button
                                onClick={handleImportSetlist}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-6 text-lg font-bold shadow-lg shadow-blue-500/20"
                                disabled={!importText.trim()}
                            >
                                Import {importText.split('\n').filter(l => l.trim()).length} Songs
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setIsImportOpen(false)}
                                className="rounded-xl py-6 text-lg font-bold border-slate-200 dark:border-slate-700 h-auto"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Setlist Song Dialog */}
            <Dialog open={isEditSetSongOpen} onOpenChange={setIsEditSetSongOpen}>
                <DialogContent className="w-full h-full max-w-none m-0 rounded-none flex flex-col p-0 bg-white dark:bg-slate-900 overflow-hidden [&>button]:!top-[calc(1.5rem+env(safe-area-inset-top,0px))] [&>button]:!right-6">
                    <DialogHeader className="p-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] border-b border-slate-100 dark:border-slate-800">
                        <DialogTitle className="text-xl font-bold">Edit Song</DialogTitle>
                        <DialogDescription>
                            Update the details of the song in the setlist.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto py-8 px-4 md:px-20 max-w-4xl mx-auto w-full space-y-6">
                        <div className="space-y-2">
                            <Label>Song Title {learningSet.some(s => s.id === editingSetSongId) ? '(Optional)' : ''}</Label>
                            <Input
                                placeholder={learningSet.some(s => s.id === editingSetSongId) ? "e.g. Goodness of God" : "e.g. Way Maker"}
                                value={editingSetlistSongData.title}
                                onChange={(e) => setEditingSetlistSongData({ ...editingSetlistSongData, title: e.target.value })}
                            />
                        </div>
                        {!learningSet.some(s => s.id === editingSetSongId) && (
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
                        )}
                        <div className="space-y-2">
                            <Label>Youtube video URL</Label>
                            <Input
                                placeholder="https://youtube.com/..."
                                value={editingSetlistSongData.url}
                                onChange={(e) => setEditingSetlistSongData({ ...editingSetlistSongData, url: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Lyrics</Label>
                            <Textarea
                                placeholder="Paste lyrics here..."
                                className="min-h-[150px] font-sans"
                                value={editingSetlistSongData.lyrics || ""}
                                onChange={(e) => setEditingSetlistSongData({ ...editingSetlistSongData, lyrics: e.target.value })}
                            />
                        </div>

                        <div className="pt-4">
                            <Button onClick={handleSaveEditSetSong} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-bold rounded-2xl shadow-lg transition-all">
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Saturday Prayer Accountability Modal - Galway Only */}
            <Dialog open={isPrayerAccountabilityOpen} onOpenChange={setIsPrayerAccountabilityOpen}>
                <DialogContent className="max-w-4xl p-0 h-[100dvh] w-full md:h-auto overflow-hidden bg-slate-900 border-none rounded-none md:rounded-[2rem] shadow-2xl z-[201] [&>button]:hidden" aria-describedby="prayer-accountability-desc">
                    <div className="relative w-full h-full overflow-y-auto no-scrollbar">
                        <Card className="bg-gradient-to-br from-indigo-900 to-blue-900 border-none shadow-none overflow-hidden relative text-white rounded-none md:rounded-[2rem] min-h-full">



                            {/* Close Button */}
                            <button
                                onClick={() => setIsPrayerAccountabilityOpen(false)}
                                className="absolute top-[calc(1.5rem+env(safe-area-inset-top))] right-6 z-50 p-2 bg-black/20 hover:bg-black/40 text-white/70 hover:text-white rounded-full transition-all backdrop-blur-sm"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <CardHeader className="pb-4 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 pt-[calc(2rem+env(safe-area-inset-top))]">
                                <div className="space-y-1 pr-12">
                                    <DialogTitle className="flex items-center gap-3 text-white text-2xl md:text-3xl font-black">
                                        Saturday Prayer Accountability
                                    </DialogTitle>
                                    <p id="prayer-accountability-desc" className="sr-only">
                                        Check off your name after completing your one-hour prayer session on Saturday.
                                    </p>
                                    <CardDescription className="text-blue-200 font-medium text-lg md:text-xl flex items-center gap-2 pt-2">
                                        <Calendar className="w-5 h-5 text-blue-300" />
                                        {format(new Date().getDay() === 6 ? new Date() : nextSaturday(new Date()), "EEEE, do 'of' MMMM yyyy")}
                                    </CardDescription>
                                </div>
                                <div className="px-6 py-3 bg-white/10 rounded-full border border-white/20 backdrop-blur-sm w-fit">
                                    <span className="text-base font-bold text-white flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-yellow-300" />
                                        1 Hour Prayer
                                    </span>
                                </div>
                            </CardHeader>

                            <CardContent className="relative z-10 pb-[calc(4rem+env(safe-area-inset-bottom))] px-8">
                                <p className="text-blue-100/70 mb-8 max-w-2xl text-lg">
                                    Each member in the choir is required to pray for at least one hour for the choir every Saturday. Tick your name when you've completed your prayer!
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {PRAYER_TEAM.map(name => {
                                        const memberStats = prayerStats.userStats[name] || { missedWeeks: 0, lastWeekStatus: 'completed' };
                                        const isMissedLastWeek = memberStats.lastWeekStatus === 'missed';

                                        return (
                                            <button
                                                key={name}
                                                onClick={() => togglePrayer(name)}
                                                className={cn(
                                                    "p-6 rounded-3xl border transition-all duration-300 group text-left relative overflow-hidden h-36 flex flex-col justify-between",
                                                    prayerChecklist[name]
                                                        ? "bg-white text-indigo-900 border-white shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-[1.02] z-10"
                                                        : "bg-white/5 hover:bg-white/10 border-white/10 text-white backdrop-blur-sm hover:scale-[1.02]"
                                                )}
                                            >
                                                {prayerChecklist[name] && (
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white via-indigo-50 to-blue-100 opacity-100" />
                                                )}

                                                <div className="relative z-10 flex justify-between items-start w-full">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all duration-300",
                                                        prayerChecklist[name]
                                                            ? "border-indigo-600 bg-indigo-600 text-white shadow-lg"
                                                            : "border-white/30 group-hover:border-white/60"
                                                    )}>
                                                        {prayerChecklist[name] && <Check className="w-6 h-6" strokeWidth={4} />}
                                                    </div>

                                                    {memberStats.missedWeeks > 0 && !prayerChecklist[name] && (
                                                        <div className="bg-red-500 text-white text-[10px] px-2 py-1 rounded-full font-black animate-pulse flex items-center gap-1">
                                                            MISSED {memberStats.missedWeeks} {memberStats.missedWeeks === 1 ? 'WEEK' : 'WEEKS'}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="relative z-10 space-y-1">
                                                    <span className={cn(
                                                        "font-black text-lg block truncate transition-colors",
                                                        prayerChecklist[name] ? "text-indigo-900" : "text-blue-100"
                                                    )}>
                                                        {name}
                                                    </span>

                                                    {isMissedLastWeek && !prayerChecklist[name] ? (
                                                        <span className="text-red-400 text-[10px] font-bold block animate-bounce">
                                                            DID NOT PRAY LAST WEEK
                                                        </span>
                                                    ) : (
                                                        <span className={cn(
                                                            "text-xs uppercase tracking-[0.1em] font-black block transition-colors",
                                                            prayerChecklist[name] ? "text-indigo-600" : "text-white/40"
                                                        )}>
                                                            {prayerChecklist[name] ? "Completed" : "Pending"}
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </CardContent>

                            <div className="p-8 text-center relative z-10">
                                <Button
                                    onClick={() => setIsPrayerAccountabilityOpen(false)}
                                    className="bg-white/10 hover:bg-white/20 text-white border-none rounded-2xl px-8 h-12 font-bold"
                                >
                                    Close Checklist
                                </Button>
                            </div>
                        </Card>
                    </div>
                </DialogContent>
            </Dialog>

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

            {/* REMOVED: Edit Learning Focus Dialog */}
            {/* <Dialog open={isEditLearningFocusOpen} onOpenChange={setIsEditLearningFocusOpen}>...</Dialog> */}
            {/* OLD LEARNING FOCUS DIALOG REMOVED */}
            {/* </Dialog> */}

            {/* Hero Header */}
            <div className="relative h-auto md:h-[300px] overflow-hidden pb-8 pt-2" > {/* Removed pt-20, using pt-2 for a snug fit with global spacer */}
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
                                {locationName} Choir Portal
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
                            {locationId === 'galway' && (
                                <Button
                                    className="bg-indigo-500/30 text-white hover:bg-indigo-500/40 backdrop-blur-md border border-white/20 flex-1 md:flex-none"
                                    onClick={() => setIsPrayerAccountabilityOpen(true)}
                                >
                                    1 Hour Saturday Prayer Accountability
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div >

            {/* Main Content */}
            <div id="main-content" className="container mx-auto px-2 sm:px-4 py-8 -mt-6 relative z-10">
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
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >

                            {/* LEARNING FOCUS SECTION - REFACTORED FOR MULTIPLE SONGS */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                        <Music className="w-6 h-6 mr-3 text-blue-600" />
                                        New Song{learningSet.length > 1 ? 's' : ''} Focus
                                    </h2>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-blue-600 hover:bg-blue-50 font-bold mr-0"
                                        onClick={() => openAddSetSong('learning')}
                                    >
                                        <PlusCircle className="w-4 h-4 mr-2" />
                                        Add Focus Song
                                    </Button>
                                </div>

                                {/* Consolidated Hero Container for all focus songs (Vocalists) */}
                                {learningSet.length > 0 ? (
                                    <Card className="relative overflow-hidden border-none shadow-2xl bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 rounded-[2.5rem] p-1 group/hero">
                                        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none group-hover/hero:bg-white/20"></div>

                                        <CardContent className="relative z-10 p-6 md:p-10 flex flex-col gap-8">
                                            <div className="flex flex-col items-center text-center space-y-4">
                                                <h3 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                                                    What are we learning next?
                                                </h3>
                                                <p className="text-blue-100/80 text-lg font-medium leading-relaxed max-w-2xl">
                                                    Listen, practice, and master {learningSet.length > 1 ? 'these songs' : 'this song'} before practice!
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                                {learningSet.map((song) => {
                                                    const videoId = extractYoutubeId(song.url);
                                                    return (
                                                        <div key={song.id} className="space-y-4 group/song relative">
                                                            {/* ACTIONS */}
                                                            <div className="absolute top-2 right-2 z-20 flex gap-2 opacity-0 group-hover/song:opacity-100 transition-all translate-y-2 group-hover/song:translate-y-0">
                                                                <Button size="icon" variant="secondary" className="h-9 w-9 bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-blue-600 border-0 rounded-xl shadow-lg ring-1 ring-white/10" onClick={() => startEditSetSong(song)}>
                                                                    <Edit3 className="w-4 h-4" />
                                                                </Button>
                                                                <Button size="icon" variant="secondary" className="h-9 w-9 bg-white/20 backdrop-blur-md hover:bg-rose-500 text-white border-0 rounded-xl shadow-lg ring-1 ring-white/10" onClick={() => removeSetSong('learning', song.id)}>
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>

                                                            <div className="w-full aspect-video rounded-[2rem] overflow-hidden shadow-2xl ring-4 ring-white/10 bg-black/40">
                                                                {videoId ? (
                                                                    <iframe
                                                                        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                                                                        title={song.title}
                                                                        className="w-full h-full"
                                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                        allowFullScreen
                                                                        loading="lazy"
                                                                        {...({ fetchpriority: "low" } as any)}
                                                                    />
                                                                ) : (
                                                                    <div className="flex h-full items-center justify-center text-white/40">
                                                                        <div className="text-center p-4">
                                                                            <Music className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                                                            No Video
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {song.title && (
                                                                <h3 className="text-xl font-bold text-white px-2 line-clamp-2">
                                                                    {song.title}
                                                                </h3>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <Card className="relative overflow-hidden border-none shadow-2xl bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 rounded-[2.5rem] p-8 flex flex-col justify-center min-h-[300px] group md:col-span-2 lg:col-span-3">
                                        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                                        <div className="relative z-10 space-y-6 text-center">

                                            <div className="space-y-2">
                                                <h3 className="text-3xl font-black text-white">What are we learning next?</h3>
                                                <p className="text-blue-100/80 text-lg font-medium">No new songs set yet. Add one to get started!</p>
                                            </div>
                                            <div className="flex justify-center">
                                                <Button onClick={() => openAddSetSong('learning')} className="bg-white text-blue-600 hover:bg-blue-50 font-black rounded-2xl px-8 py-6 h-auto shadow-xl w-fit">
                                                    <PlusCircle className="w-5 h-5 mr-3" />
                                                    Add Your First Focus Song
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                )}
                            </div>



                            {/* SPLIT SETLIST SECTION */}
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
                                    <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center whitespace-nowrap">
                                        <ListMusic className="w-6 h-6 mr-3 text-blue-600 shrink-0" />
                                        This Week's Setlist
                                    </h2>

                                    <div className="flex gap-2">
                                        {/* Archive Button */}
                                        <Button
                                            variant="outline"
                                            className="h-12 rounded-2xl border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-100 px-4 font-bold shadow-sm"
                                            onClick={handleArchiveSetlist}
                                            title="Archive this week's songs to a folder"
                                        >
                                            <Archive className="w-4 h-4 sm:mr-2" />
                                            <span className="hidden sm:inline">Archive Week</span>
                                        </Button>

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
                                                <Button size="icon" variant="ghost" className="text-red-600 hover:bg-red-100/50" onClick={() => clearSet('praise')} title="Clear all songs from Praise Set">
                                                    <Trash2 className="w-5 h-5" />
                                                </Button>
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
                                            <SortableContext
                                                items={praiseSet.map(s => s.id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                {praiseSet.map((song, i) => (
                                                    <SortableSetSongCard
                                                        key={song.id}
                                                        song={song}
                                                        index={i}
                                                        onPlay={playVideo}
                                                        onEdit={startEditSetSong}
                                                        onRemove={(id) => removeSetSong('praise', id)}
                                                        onViewLyrics={(lyrics, title) => {
                                                            setPreviewLyrics({ title, content: lyrics });
                                                            setIsPreviewLyricsOpen(true);
                                                        }}
                                                    />
                                                ))}
                                            </SortableContext>
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
                                                <Button size="icon" variant="ghost" className="text-red-600 hover:bg-red-100/50" onClick={() => clearSet('worship')} title="Clear all songs from Worship Set">
                                                    <Trash2 className="w-5 h-5" />
                                                </Button>
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
                                            <SortableContext
                                                items={worshipSet.map(s => s.id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                {worshipSet.map((song, i) => (
                                                    <SortableSetSongCard
                                                        key={song.id}
                                                        song={song}
                                                        index={i}
                                                        onPlay={playVideo}
                                                        onEdit={startEditSetSong}
                                                        onRemove={(id) => removeSetSong('worship', id)}
                                                        onViewLyrics={(lyrics, title) => {
                                                            setPreviewLyrics({ title, content: lyrics });
                                                            setIsPreviewLyricsOpen(true);
                                                        }}
                                                    />
                                                ))}
                                            </SortableContext>
                                            {worshipSet.length === 0 && (
                                                <p className="text-center text-sm text-slate-400 py-4 italic">No songs added yet.</p>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
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

                                            <Dialog open={isEditFolderOpen} onOpenChange={setIsEditFolderOpen}>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Edit Folder Name</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="py-4">
                                                        <Label>Folder Name</Label>
                                                        <Input
                                                            placeholder="e.g. Wedding Set"
                                                            className="mt-2"
                                                            value={editFolderName}
                                                            onChange={(e) => setEditFolderName(e.target.value)}
                                                        />
                                                    </div>
                                                    <DialogFooter className="flex gap-2">
                                                        <Button variant="outline" className="flex-1" onClick={() => setIsEditFolderOpen(false)}>Cancel</Button>
                                                        <Button onClick={handleUpdateFolder} className="bg-blue-600 text-white flex-1">Save Changes</Button>
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
                                                        <DialogContent className="w-full h-full max-w-none m-0 rounded-none flex flex-col p-0 bg-white dark:bg-slate-900 overflow-hidden [&>button]:!top-[calc(1.5rem+env(safe-area-inset-top,0px))] [&>button]:!right-6">
                                                            <DialogHeader className="p-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] border-b border-slate-100 dark:border-slate-800">
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

                                            {/* Folder Options Dialog (Long Press) */}
                                            <Dialog open={isFolderOptionsOpen} onOpenChange={setIsFolderOptionsOpen}>
                                                <DialogContent className="sm:max-w-md w-[90%] rounded-2xl">
                                                    <DialogHeader>
                                                        <DialogTitle>Folder Options: {folderForOptions?.name}</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="grid grid-cols-2 gap-4 py-4">
                                                        <Button
                                                            variant="outline"
                                                            className="h-24 flex flex-col items-center justify-center gap-2 border-slate-200 dark:border-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-xl"
                                                            onClick={() => {
                                                                setIsFolderOptionsOpen(false);
                                                                startEditFolder(folderForOptions);
                                                            }}
                                                        >
                                                            <Pencil className="w-8 h-8 text-blue-500" />
                                                            <span className="font-bold">Rename</span>
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            className="h-24 flex flex-col items-center justify-center gap-2 border-slate-200 dark:border-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl"
                                                            onClick={() => {
                                                                setIsFolderOptionsOpen(false);
                                                                if (window.confirm(`Are you sure you want to delete "${folderForOptions?.name}"?`)) {
                                                                    deleteFolder(folderForOptions.id);
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="w-8 h-8 text-red-500" />
                                                            <span className="font-bold">Delete</span>
                                                        </Button>
                                                    </div>
                                                    <DialogFooter>
                                                        <Button variant="ghost" onClick={() => setIsFolderOptionsOpen(false)} className="w-full">Cancel</Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </div>

                                    <CardContent className="p-6 flex-1 overflow-y-auto">
                                        {!activeFolderId ? (
                                            // Folder Grid View (Root only)
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                {folders.filter(f => !f.parent_id).map(folder => (
                                                    <DroppableFolder
                                                        key={folder.id}
                                                        id={`folder-${folder.id}`}
                                                        onClick={() => setActiveFolderId(folder.id)}
                                                        onLongPress={() => {
                                                            setFolderForOptions(folder);
                                                            setIsFolderOptionsOpen(true);
                                                        }}
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
                                                                    <DropdownMenuItem className="text-blue-600" onClick={() => startEditFolder(folder)}>
                                                                        <Pencil className="w-4 h-4 mr-2" /> Rename
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem className="text-red-600" onClick={() => deleteFolder(folder.id)}>
                                                                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </DroppableFolder>
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
                                            <DroppableFolder
                                                id={`folder-${activeFolderId}`}
                                                className="space-y-6 min-h-[500px]" // Added min-h to ensure drop area exists even if empty
                                            >
                                                {/* Subfolders if any */}
                                                {folders.filter(f => f.parent_id === activeFolderId).length > 0 && (
                                                    <div className="space-y-3">
                                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subfolders</h4>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                            {folders.filter(f => f.parent_id === activeFolderId).map(folder => (
                                                                <DroppableFolder
                                                                    key={folder.id}
                                                                    id={`folder-${folder.id}`}
                                                                    onClick={() => setActiveFolderId(folder.id)}
                                                                    onLongPress={() => startEditFolder(folder)}
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
                                                                                <Button size="icon" variant="ghost" className="h-6 w-6">
                                                                                    <MoreVertical className="w-4 h-4 text-slate-400" />
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent>
                                                                                <DropdownMenuItem className="text-blue-600" onClick={() => startEditFolder(folder)}>
                                                                                    <Pencil className="w-4 h-4 mr-2" /> Rename
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem className="text-red-600" onClick={() => deleteFolder(folder.id)}>
                                                                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                                                </DropdownMenuItem>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    </div>
                                                                </DroppableFolder>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Songs */}
                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Songs</h4>
                                                    <div className="space-y-2">
                                                        {activeFolder?.songs?.length > 0 ? (
                                                            activeFolder.songs.map((song: any) => (
                                                                <div key={song.id} className="group flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-50 dark:border-slate-800 last:border-0 transition-colors">
                                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center shrink-0 text-xs font-bold">
                                                                            {song.key || "?"}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate">{song.title}</h4>
                                                                            <p className="text-xs text-slate-500 truncate">{song.artist || "Unknown Artist"}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        {song.url && (
                                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => song.url && playVideo(song.url, song.title)}>
                                                                                <PlayCircle className="w-4 h-4" />
                                                                            </Button>
                                                                        )}
                                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => startEditSong(song)}>
                                                                            <Edit3 className="w-4 h-4" />
                                                                        </Button>
                                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDeleteSong(song.id)}>
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p className="text-sm text-slate-400 italic pl-2">No songs in this folder yet.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </DroppableFolder>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                        </DndContext>
                    </TabsContent>

                    <TabsContent value="instrumentalists" className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* LEARNING FOCUS SECTION (INSTRUMENTALISTS) */}
                        {/* LEARNING FOCUS SECTION (INSTRUMENTALISTS) */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                    <Music className="w-6 h-6 mr-3 text-blue-600" />
                                    New Song{learningSet.length > 1 ? 's' : ''} Focus
                                </h2>
                            </div>

                            {/* Consolidated Hero Container for all focus songs (Instrumentalists) */}
                            {learningSet.length > 0 ? (
                                <Card className="relative overflow-hidden border-none shadow-2xl bg-gradient-to-br from-indigo-600 via-blue-700 to-slate-900 rounded-[2.5rem] p-1 transition-all hover:scale-[1.005] group/hero">
                                    <div className="absolute top-0 right-0 -mt-16 -mr-16 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none group-hover/hero:bg-white/20 transition-all"></div>

                                    <CardContent className="relative z-10 p-6 md:p-10 flex flex-col gap-8">
                                        <div className="flex flex-col items-center text-center space-y-4">
                                            <h3 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                                                Band Priority
                                            </h3>
                                            <p className="text-blue-100/80 text-lg font-medium leading-relaxed max-w-2xl">
                                                Listen, practice, and master {learningSet.length > 1 ? 'these songs' : 'this song'} before practice!
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                            {learningSet.map((song) => {
                                                const videoId = extractYoutubeId(song.url);
                                                return (
                                                    <div key={song.id} className="space-y-4 group/song relative">
                                                        {/* ACTIONS */}
                                                        <div className="absolute top-2 right-2 z-20 flex gap-2 opacity-0 group-hover/song:opacity-100 transition-all translate-y-2 group-hover/song:translate-y-0">
                                                            <Button size="icon" variant="secondary" className="h-9 w-9 bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-blue-600 border-0 rounded-xl shadow-lg ring-1 ring-white/10" onClick={() => startEditSetSong(song)}>
                                                                <Edit3 className="w-4 h-4" />
                                                            </Button>
                                                            <Button size="icon" variant="secondary" className="h-9 w-9 bg-white/20 backdrop-blur-md hover:bg-rose-500 text-white border-0 rounded-xl shadow-lg ring-1 ring-white/10" onClick={() => removeSetSong('learning', song.id)}>
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>

                                                        <div className="w-full aspect-video rounded-[2rem] overflow-hidden shadow-2xl ring-4 ring-white/10 bg-black/40">
                                                            {videoId ? (
                                                                <iframe
                                                                    src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                                                                    title={song.title}
                                                                    className="w-full h-full"
                                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                    allowFullScreen
                                                                    loading="lazy"
                                                                    {...({ fetchpriority: "low" } as any)}
                                                                />
                                                            ) : (
                                                                <div className="flex h-full items-center justify-center text-white/40">
                                                                    <div className="text-center p-4">
                                                                        <Music className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                                                        No Video
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {song.title && (
                                                            <h3 className="text-xl font-bold text-white px-2 line-clamp-2">
                                                                {song.title}
                                                            </h3>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card className="relative overflow-hidden border-none shadow-2xl bg-gradient-to-br from-indigo-600 via-blue-700 to-slate-900 rounded-[2.5rem] p-6 flex flex-col justify-center min-h-[160px] transition-all hover:scale-105 group md:col-span-2 lg:col-span-3">
                                    <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                                    <div className="relative z-10 space-y-4 text-center">
                                        <div className="space-y-1">
                                            <h3 className="text-2xl font-black text-white">Band Priority</h3>
                                            <p className="text-blue-100/80 text-base font-medium">No new song focus yet</p>
                                        </div>
                                    </div>
                                </Card>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                                    <Video className="w-6 h-6 text-blue-600" />
                                    Tutorials
                                </h2>
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => {
                                    setNewInstr({ title: "", type: "Tutorial", url: "" });
                                    setIsAddInstrOpen(true);
                                }}>
                                    <Plus className="w-4 h-4 mr-2" /> Add Resource
                                </Button>
                            </div>

                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {instrResources.filter(r => r.type !== 'Backing Track').length === 0 ? (
                                    <div className="col-span-full py-12 text-center text-slate-400 bg-white/50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                        <Video className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>No resources yet. Add tutorials for the band!</p>
                                    </div>
                                ) : (
                                    instrResources.filter(r => r.type !== 'Backing Track').map((resource) => (
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
                        </div>

                        {/* Backing Tracks Section */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                                    <Music className="w-6 h-6 text-blue-600" />
                                    Backing Tracks
                                </h2>
                                <Button
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={() => {
                                        setNewInstr({ title: "", type: "Backing Track", url: "" });
                                        setIsAddInstrOpen(true);
                                    }}
                                >
                                    <Plus className="w-4 h-4 mr-2" /> Add Backing Track
                                </Button>
                            </div>

                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {instrResources.filter(r => r.type === "Backing Track").length === 0 ? (
                                    <div className="col-span-full py-12 text-center text-slate-400 bg-white/50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                        <Music className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>No backing tracks yet. Add tracks for choir practice!</p>
                                    </div>
                                ) : (
                                    instrResources.filter(r => r.type === "Backing Track").map((resource) => (
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
                                                className="h-32 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800 flex items-center justify-center group-hover:from-blue-400 group-hover:via-blue-500 group-hover:to-blue-700 transition-all cursor-pointer relative shadow-inner"
                                                onClick={() => resource.url && playVideo(resource.url, resource.title)}
                                            >
                                                {getYTThumbnail(resource.url) ? (
                                                    <div className="w-full h-full relative">
                                                        <img src={getYTThumbnail(resource.url)!} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <PlayCircle className="w-12 h-12 text-white drop-shadow-lg" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center">
                                                        <Music className="w-12 h-12 text-white/90 mb-2 drop-shadow-md" />
                                                        <PlayCircle className="w-8 h-8 text-white/40" />
                                                    </div>
                                                )}
                                            </div>
                                            <CardContent
                                                className="p-4 cursor-pointer"
                                                onClick={() => resource.url && playVideo(resource.url, resource.title)}
                                            >
                                                <Badge variant="secondary" className="mb-2 text-xs font-normal bg-blue-100 text-blue-700">
                                                    Backing Track
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

                        {/* Immersive Hero Section */}
                        <div className="relative overflow-hidden bg-slate-900 pt-4 pb-24 sm:pt-8 sm:pb-32 rounded-[3rem] border border-slate-800 p-8 md:p-12 shadow-2xl">
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

                        <AcademyDashboard locationId={locationId} />

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
                    <DialogContent className="max-w-none w-screen h-screen m-0 p-0 border-none bg-white dark:bg-slate-900 rounded-none shadow-2xl overflow-hidden flex flex-col [&>button]:!top-[calc(1.5rem+env(safe-area-inset-top,0px))] [&>button]:!right-6">
                        {/* Custom Header for Full Screen Modal */}
                        <div className="flex items-center justify-between p-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
                            <div className="flex items-center gap-4">
                                <Button variant="ghost" size="sm" onClick={() => setIsCourseModalOpen(false)} className="rounded-full h-10 w-10 p-0">
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                                <div>
                                    <h3 className="font-black uppercase tracking-tight text-sm text-blue-600">{locationName} Choir Academy</h3>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedCourse?.title}</p>
                                </div>
                            </div>
                            <Badge className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-none px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase mr-12">
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
                                    <div className="p-5 md:p-12 space-y-10 md:space-y-12">
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
                                        <section className="space-y-12 bg-slate-50 dark:bg-slate-800/50 p-5 md:p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-8">
                                                <div className="space-y-1">
                                                    <h4 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                        Professional Curriculum
                                                    </h4>
                                                    <p className="text-slate-500 font-bold text-sm">Follow the modules below to complete the course.</p>
                                                </div>
                                                <Badge className="bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 text-[10px] font-black tracking-widest px-3 py-1 rounded-full shadow-sm w-fit">
                                                    ACADEMY STANDARD • 2026
                                                </Badge>
                                            </div>

                                            <div className="prose prose-slate dark:prose-invert max-w-none space-y-12">
                                                {selectedCourse.modules?.map((module: any, mIdx: number) => {
                                                    const moduleId = `${selectedCourse.id}-${mIdx}`;
                                                    const isCompleted = completedModules.has(moduleId);

                                                    return (
                                                        <div key={mIdx}>
                                                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${mIdx * 150}ms` }}>
                                                                <div className="flex flex-col gap-4">
                                                                    <div className="flex items-center gap-3">
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
                                                                        <h5 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none pt-1">
                                                                            {module.title}
                                                                        </h5>
                                                                    </div>
                                                                    <div className="space-y-4">
                                                                        <div className="flex flex-col sm:flex-row gap-2">
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
                                                                                className="text-xs shrink-0 w-full sm:w-auto font-black tracking-widest uppercase py-4 sm:py-2"
                                                                            >
                                                                                {isCompleted ? 'Undo Completion' : 'Mark Module Complete'}
                                                                            </Button>
                                                                        </div>
                                                                        <p className="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                                                                            {module.content}
                                                                        </p>



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
                                                                    <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent opacity-50 my-12" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Vocal Training Resources Section (Specific to Vocal Lessons 101) */}
                                            {selectedCourse.id === 'vocal-101' && (
                                                <div className="mt-16 space-y-6 pt-12 border-t border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-1">
                                                            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
                                                                <Music className="w-6 h-6 text-blue-600" />
                                                                Vocal Training Resources
                                                            </h3>
                                                            <p className="text-sm text-slate-500 font-medium italic">Additional practice audios and demonstrations.</p>
                                                        </div>
                                                        {user && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setIsVocalTrainingUploadOpen(!isVocalTrainingUploadOpen)}
                                                                className="rounded-full border-blue-200 text-blue-600 hover:bg-blue-50 font-bold"
                                                            >
                                                                {isVocalTrainingUploadOpen ? 'Cancel' : 'Upload New'}
                                                            </Button>
                                                        )}
                                                    </div>

                                                    {/* Upload Form */}
                                                    {isVocalTrainingUploadOpen && (
                                                        <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-[2rem] border-2 border-dashed border-blue-200 dark:border-blue-800 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                                                            <div className="space-y-4">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <div className="space-y-2">
                                                                        <Label className="text-xs font-bold uppercase tracking-wider text-blue-900/60 dark:text-blue-100/60 ml-2">Audio Title</Label>
                                                                        <Input
                                                                            placeholder="e.g. Range Extension Exercise"
                                                                            value={newVocalTraining.title}
                                                                            onChange={(e) => setNewVocalTraining({ title: e.target.value })}
                                                                            className="bg-white border-none shadow-sm h-12 rounded-2xl font-medium"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label className="text-xs font-bold uppercase tracking-wider text-blue-900/60 dark:text-blue-100/60 ml-2">Audio File</Label>
                                                                        <div className="relative">
                                                                            <input
                                                                                type="file"
                                                                                accept="audio/*"
                                                                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                                                            />
                                                                            <div className="bg-white border-none shadow-sm h-12 rounded-2xl flex items-center px-4 text-sm text-slate-500 font-medium truncate">
                                                                                {selectedFile ? selectedFile.name : "Select Audio (.mp3, .wav...)"}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {uploadProgress !== null && (
                                                                    <div className="space-y-2 pt-2">
                                                                        <div className="flex justify-between text-xs font-black text-blue-600 uppercase tracking-widest">
                                                                            <span>{uploadProgress === 100 ? "Finalizing..." : "Uploading Track"}</span>
                                                                            <span>{uploadProgress}%</span>
                                                                        </div>
                                                                        <Progress value={uploadProgress} className="h-2 bg-white rounded-full [&>div]:bg-blue-600" />
                                                                    </div>
                                                                )}

                                                                <Button
                                                                    onClick={handleAddVocalTraining}
                                                                    disabled={uploadingFile}
                                                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20 py-6 h-auto rounded-2xl font-black text-lg"
                                                                >
                                                                    {uploadingFile ? <Loader2 className="w-5 h-5 animate-spin" /> : 'UPLOAD TO COURSE'}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Resource List */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {instrResources
                                                            .filter(r => r.type === 'Academy: vocal-101')
                                                            .map((resource) => (
                                                                <div key={resource.id} className="bg-white dark:bg-slate-900/50 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 group">
                                                                    <div className="flex items-center justify-between mb-4">
                                                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl">
                                                                            <Mic className="w-5 h-5 text-blue-600" />
                                                                        </div>
                                                                        <div className="flex gap-1 items-center">
                                                                            {audioState.audioUrl === resource.url && (
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-8 w-8 text-blue-400 hover:bg-blue-50 rounded-full"
                                                                                    onClick={() => seek(Math.max(0, audioState.currentTime - 15))}
                                                                                >
                                                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                                                </Button>
                                                                            )}
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 text-blue-600 hover:bg-blue-50 rounded-full"
                                                                                onClick={() => {
                                                                                    if (resource.url) {
                                                                                        const isCurrentTrack = audioState.audioUrl === resource.url;
                                                                                        if (isCurrentTrack) {
                                                                                            if (audioState.isPlaying) {
                                                                                                pause();
                                                                                            } else {
                                                                                                resume();
                                                                                            }
                                                                                        } else {
                                                                                            playVideo(resource.url, resource.title);
                                                                                        }
                                                                                    }
                                                                                }}
                                                                            >
                                                                                {audioState.audioUrl === resource.url && audioState.isPlaying ? (
                                                                                    <Pause className="w-4 h-4" />
                                                                                ) : (
                                                                                    <Play className="w-4 h-4" />
                                                                                )}
                                                                            </Button>
                                                                            {audioState.audioUrl === resource.url && (
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-8 w-8 text-blue-400 hover:bg-blue-50 rounded-full"
                                                                                    onClick={() => seek(Math.min(audioState.duration, audioState.currentTime + 15))}
                                                                                >
                                                                                    <RotateCw className="w-3.5 h-3.5" />
                                                                                </Button>
                                                                            )}
                                                                            {user && (
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-full"
                                                                                    onClick={async () => {
                                                                                        if (window.confirm("Delete this training resource?")) {
                                                                                            await choirService.deleteInstrumentalResource(resource.id);
                                                                                            toast.success("Resource deleted");
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1 line-clamp-1">{resource.title}</h4>
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Audio Resource</p>
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>
                                            )}
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
                </Dialog >

                {/* SHARED STRATEGIC PLANNER SECTION */}
                < div className="mt-20 pt-12 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-8 duration-700" >
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
                </div >
            </div >

            {/* Dialogs for Instrumental Resources */}
            {/* Unified Media Player Modal */}
            <Dialog open={!!currentMedia} onOpenChange={(open) => {
                if (!open) {
                    setCurrentMedia(null);
                    setIsMiniPlayerHidden(false);
                }
            }}>
                <DialogContent className="w-full max-w-full sm:max-w-4xl h-[calc(100svh-env(safe-area-inset-top))] sm:h-auto top-[env(safe-area-inset-top)] sm:top-1/2 translate-y-0 sm:-translate-y-1/2 p-0 overflow-hidden bg-black border-none shadow-2xl sm:rounded-2xl flex flex-col" aria-describedby="media-player-description">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Media Player</DialogTitle>
                        <DialogDescription id="media-player-description">
                            Playing {currentMedia?.title}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="relative w-full flex-1 flex flex-col items-center justify-center bg-black overflow-hidden">
                        {/* Close Button Overlay */}
                        <div className="absolute top-4 right-4 z-50">
                            <Button
                                size="icon"
                                variant="secondary"
                                className="rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 backdrop-blur-md"
                                onClick={() => {
                                    setCurrentMedia(null);
                                    setIsMiniPlayerHidden(false);
                                }}
                            >
                                <div className="w-4 h-4 flex items-center justify-center font-bold">✕</div>
                            </Button>
                        </div>

                        {currentMedia?.type === 'video' && (
                            <div className="w-full aspect-video">
                                <iframe
                                    src={currentMedia.url}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        )}

                        {currentMedia?.type === 'audio' && (
                            <div className="w-full h-full py-12 px-6 flex flex-col items-center justify-center space-y-8 bg-gradient-to-b from-gray-900 to-black overflow-y-auto">
                                <div className="text-center space-y-4 max-w-md">
                                    <div className="w-48 h-48 mx-auto rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800 flex items-center justify-center shadow-2xl shadow-blue-900/40 animate-pulse border border-white/5">
                                        <Music className="w-24 h-24 text-white/40" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white">{currentMedia?.title || "Audio Track"}</h3>
                                        <p className="text-sm text-gray-400">Backing Track</p>
                                    </div>
                                </div>

                                {/* Controls synced with global audio */}
                                <div className="w-full max-w-md space-y-6">
                                    <div className="space-y-2">
                                        <Slider
                                            value={[audioState.currentTime]}
                                            max={audioState.duration || 100}
                                            step={1}
                                            onValueChange={(vals) => seek(vals[0])}
                                            className="cursor-pointer"
                                        />
                                        <div className="flex justify-between text-xs text-gray-400 font-mono">
                                            <span>{(() => {
                                                const mins = Math.floor(audioState.currentTime / 60);
                                                const secs = Math.floor(audioState.currentTime % 60);
                                                return `${mins}:${secs.toString().padStart(2, '0')}`;
                                            })()}</span>
                                            <span>{(() => {
                                                const mins = Math.floor(audioState.duration / 60);
                                                const secs = Math.floor(audioState.duration % 60);
                                                return `${mins}:${secs.toString().padStart(2, '0')}`;
                                            })()}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-center gap-8">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-white/70 hover:text-white hover:bg-white/10"
                                            onClick={() => seek(Math.max(0, audioState.currentTime - 15))}
                                        >
                                            <RotateCcw className="w-6 h-6" />
                                        </Button>

                                        <Button
                                            size="icon"
                                            className="w-16 h-16 rounded-full bg-white text-black hover:bg-white/90 shadow-xl shadow-white/10"
                                            onClick={audioState.isPlaying ? pause : resume}
                                        >
                                            {audioState.isPlaying ? (
                                                <Pause className="w-8 h-8 fill-current" />
                                            ) : (
                                                <Play className="w-8 h-8 fill-current ml-1" />
                                            )}
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-white/70 hover:text-white hover:bg-white/10"
                                            onClick={() => seek(Math.min(audioState.duration, audioState.currentTime + 15))}
                                        >
                                            <RotateCw className="w-6 h-6" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddInstrOpen} onOpenChange={setIsAddInstrOpen}>
                <DialogContent className="w-full h-full sm:h-auto max-w-none sm:max-w-[425px] m-0 p-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] sm:p-6 sm:rounded-2xl shadow-xl overflow-y-auto [&>button]:!top-[calc(1.5rem+env(safe-area-inset-top,0px))] [&>button]:!right-6">
                    <DialogHeader>
                        <DialogTitle>Add Instrumental Resource</DialogTitle>
                        <DialogDescription>Add a tutorial or technical guide for the band.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                                placeholder={newInstr.type === 'Backing Track' ? "e.g. Here as in heaven" : "e.g. Advanced Piano Chords"}
                                value={newInstr.title}
                                onChange={e => setNewInstr({ ...newInstr, title: e.target.value })}
                            />
                        </div>
                        {newInstr.type !== 'Backing Track' && (
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
                                        <SelectItem value="Backing Track">Backing Track</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {newInstr.type !== 'Backing Track' && (
                            <div className="space-y-2">
                                <Label>URL (YouTube/Link)</Label>
                                <Input placeholder="https://..." value={newInstr.url} onChange={e => setNewInstr({ ...newInstr, url: e.target.value })} />
                                <p className="text-xs text-slate-500">Paste a YouTube URL or direct link</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Or Upload File</Label>
                            <Input
                                type="file"
                                accept="audio/*,video/*,.mp3,.mp4,.wav,.m4a,.aac,.mov,.avi,application/pdf"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setSelectedFile(file);
                                        // Clear URL if file is selected
                                        setNewInstr({ ...newInstr, url: "" });
                                    }
                                }}
                            />
                            {selectedFile && (
                                <p className="text-xs text-blue-600">Selected: {selectedFile.name}</p>
                            )}
                            <p className="text-xs text-slate-500">Upload audio or video file (MP3, MP4, etc.)</p>
                        </div>

                        {uploadingFile && uploadProgress !== null && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                                <div className="flex justify-between text-xs font-bold text-blue-600 uppercase tracking-widest">
                                    <span>{uploadProgress === 100 ? "Finalizing..." : "Uploading Track"}</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <Progress value={uploadProgress} className="h-2 bg-blue-100" />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={handleAddInstrResource}
                            className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                            disabled={uploadingFile}
                        >
                            {uploadingFile ? "Uploading..." : "Add Resource"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >



            <Dialog open={isEditInstrOpen} onOpenChange={setIsEditInstrOpen}>
                <DialogContent className="w-full h-full sm:h-auto max-w-none sm:max-w-[425px] m-0 p-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] sm:p-6 sm:rounded-2xl shadow-xl overflow-y-auto [&>button]:!top-[calc(1.5rem+env(safe-area-inset-top,0px))] [&>button]:!right-6">
                    <DialogHeader>
                        <DialogTitle>Edit Instrumental Resource</DialogTitle>
                        <DialogDescription>
                            Modify the details of an existing band resource.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                                placeholder={instrToEdit.type === 'Backing Track' ? "e.g. Here as in heaven" : "e.g. Advanced Piano Chords"}
                                value={instrToEdit.title}
                                onChange={e => setInstrToEdit({ ...instrToEdit, title: e.target.value })}
                            />
                        </div>
                        {instrToEdit.type !== 'Backing Track' && (
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
                                        <SelectItem value="Backing Track">Backing Track</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {instrToEdit.type !== 'Backing Track' && (
                            <div className="space-y-2">
                                <Label>URL (YouTube/Link)</Label>
                                <Input placeholder="https://..." value={instrToEdit.url} onChange={e => setInstrToEdit({ ...instrToEdit, url: e.target.value })} />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSaveEditInstrResource} className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Lyrics Preview Modal */}
            <Dialog open={isPreviewLyricsOpen} onOpenChange={setIsPreviewLyricsOpen}>
                <DialogContent className="max-w-[100vw] w-[95vw] h-[85vh] max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-3xl border-none shadow-2xl bg-white dark:bg-slate-900 mx-auto my-auto">
                    <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <DialogTitle className="flex items-center justify-center gap-3 text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                            <FileMusic className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
                            {previewLyrics?.title}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Viewing lyrics for {previewLyrics?.title}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-50 dark:bg-slate-900/50">
                        <p className="whitespace-pre-wrap text-xl md:text-3xl leading-relaxed font-bold text-slate-700 dark:text-slate-300 font-sans max-w-4xl mx-auto text-center">
                            {previewLyrics?.content || "No lyrics available."}
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
};

export default ChoirPage;
