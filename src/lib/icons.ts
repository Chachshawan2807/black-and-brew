/**
 * Central Lucide icon hub for BLACKANDBREW ERP.
 * Import icons from here instead of `lucide-react` directly.
 */
export type { LucideIcon, LucideProps } from 'lucide-react';

/** Default stroke width for standalone icons (panels, FABs, inline actions). */
export const ICON_STROKE = 1.75;

/** Standard icon sizes in pixels. */
export const ICON_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
} as const;

// Navigation
export {
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Home,
  Menu,
} from 'lucide-react';

// Actions
export {
  Check,
  CheckCheck,
  Clipboard,
  Copy,
  Download,
  Eye,
  ImageDown,
  Pencil,
  Plus,
  PlusCircle,
  Redo2,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Share,
  SquarePlus,
  Trash2,
  Undo2,
  X,
  ZoomIn,
} from 'lucide-react';

// Status & feedback
export {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  HelpCircle,
  Loader2,
  WifiOff,
} from 'lucide-react';

// Calendar & schedule
export {
  Calendar,
  CalendarClock,
  CalendarDays,
  CalendarOff,
  CalendarRange,
  CalendarX,
  Clock3,
  Sun,
} from 'lucide-react';

// Security & auth
export {
  Fingerprint,
  Lock,
  LogIn,
  LogOut,
  ScanFace,
  Shield,
  ShieldAlert,
  ShieldX,
} from 'lucide-react';

// Inventory & stock
export {
  ArrowDown,
  ArrowUp,
  CloudUpload,
  History,
  Layers,
  List,
  Package,
  PackageMinus,
  PackagePlus,
  ShoppingCart,
  SlidersHorizontal,
  Truck,
} from 'lucide-react';

// Domain modules
export {
  Banknote,
  ChartColumn,
  Bell,
  ClipboardCheck,
  ClipboardList,
  Coffee,
  GripVertical,
  MapPin,
  Minus,
  Monitor,
  Settings,
  Settings2,
  Smartphone,
  Tablet,
  User,
  UserCog,
  Users,
  Wrench,
} from 'lucide-react';

// UI chrome (shadcn)
export { Circle, Dot, Moon } from 'lucide-react';

// Aliases used by date pickers
export { Calendar as CalendarIcon } from 'lucide-react';

/** @deprecated Use ChartColumn. Kept for existing imports. */
export { ChartColumn as BarChart3 } from 'lucide-react';
