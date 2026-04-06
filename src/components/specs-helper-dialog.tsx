"use client"

import { useState, useEffect } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { HelpCircle, Terminal, Monitor, Copy, Check, Database, Cpu, HardDrive } from "lucide-react"

function detectOS(): "windows" | "macos" | "linux" {
  if (typeof navigator === "undefined") return "windows"
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes("mac")) return "macos"
  if (ua.includes("linux") || ua.includes("x11")) return "linux"
  return "windows"
}

function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      className="group flex items-center gap-2 bg-muted/60 rounded-md px-3 py-2 cursor-pointer hover:bg-muted transition-colors"
      onClick={handleCopy}
    >
      <Terminal className="w-3 h-3 text-muted-foreground shrink-0" />
      <code className="text-[11px] font-mono flex-1 break-all select-all">{command}</code>
      {copied
        ? <Check className="w-3 h-3 text-emerald-500 shrink-0" />
        : <Copy className="w-3 h-3 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0 transition-colors" />
      }
    </div>
  )
}

interface SpecBlockProps {
  icon: React.ReactNode
  label: string
  guiPath: string
  command: string
  tip?: string
}

function SpecBlock({ icon, label, guiPath, command, tip }: SpecBlockProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed pl-5">{guiPath}</p>
      <div className="pl-5">
        <CopyCommand command={command} />
      </div>
      {tip && (
        <p className="text-[10px] text-muted-foreground/60 pl-5 italic">{tip}</p>
      )}
    </div>
  )
}

const ICON_CLASS = "w-3.5 h-3.5 text-muted-foreground shrink-0"

export function SpecsHelperDialog() {
  const [defaultOS, setDefaultOS] = useState<"windows" | "macos" | "linux">("windows")

  useEffect(() => {
    setDefaultOS(detectOS())
  }, [])

  return (
    <Dialog>
      <DialogTrigger>
        <button className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-primary transition-colors group">
          <HelpCircle className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
          How do I find these?
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Finding your hardware specs
          </DialogTitle>
          <DialogDescription>
            Quick ways to find the 4 values you need. Click any command to copy it.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultOS} key={defaultOS}>
          <TabsList className="w-full">
            <TabsTrigger value="windows" className="flex-1 text-xs">Windows</TabsTrigger>
            <TabsTrigger value="macos" className="flex-1 text-xs">macOS</TabsTrigger>
            <TabsTrigger value="linux" className="flex-1 text-xs">Linux</TabsTrigger>
          </TabsList>

          {/* Windows */}
          <TabsContent value="windows" className="space-y-4 pt-3">
            <div className="space-y-1 mb-3">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">Quickest way:</span>{" "}
                Open <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">Task Manager</Badge> (Ctrl+Shift+Esc) and go to the Performance tab. RAM, CPU cores, and GPU VRAM are all visible.
              </p>
            </div>
            <SpecBlock
              icon={<Database className={ICON_CLASS} />}
              label="RAM"
              guiPath="Settings > System > About > Installed RAM"
              command={`systeminfo | findstr "Total Physical Memory"`}
              tip="Or just check Task Manager > Performance > Memory"
            />
            <SpecBlock
              icon={<Monitor className={ICON_CLASS} />}
              label="VRAM (GPU memory)"
              guiPath="Task Manager > Performance > GPU > Dedicated GPU Memory"
              command="nvidia-smi --query-gpu=memory.total --format=csv,noheader"
              tip="No GPU or AMD? Try: Settings > Display > Advanced display > Display adapter properties"
            />
            <SpecBlock
              icon={<Cpu className={ICON_CLASS} />}
              label="CPU cores"
              guiPath="Task Manager > Performance > CPU > Cores (bottom right)"
              command="echo %NUMBER_OF_PROCESSORS%"
              tip="This shows logical cores (threads). Physical cores are half this for most CPUs."
            />
            <SpecBlock
              icon={<HardDrive className={ICON_CLASS} />}
              label="Free disk space"
              guiPath="File Explorer > This PC > check the bar under your drive"
              command={`wmic logicaldisk get freespace,caption`}
              tip="Models download to your main drive. Check whichever drive you plan to use."
            />
          </TabsContent>

          {/* macOS */}
          <TabsContent value="macos" className="space-y-4 pt-3">
            <div className="space-y-1 mb-3">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">Quickest way:</span>{" "}
                Apple menu &gt; About This Mac shows RAM and chip info. For Apple Silicon, VRAM = unified memory (same as RAM).
              </p>
            </div>
            <SpecBlock
              icon={<Database className={ICON_CLASS} />}
              label="RAM"
              guiPath="Apple menu > About This Mac > Memory"
              command={`sysctl -n hw.memsize | awk '{print $0/1073741824" GB"}'`}
              tip="Apple Silicon shares RAM between CPU and GPU — enter the same value for both."
            />
            <SpecBlock
              icon={<Monitor className={ICON_CLASS} />}
              label="VRAM (GPU memory)"
              guiPath="Apple Silicon: same as RAM. Intel Mac: About This Mac > Displays > VRAM"
              command={`system_profiler SPDisplaysDataType | grep "VRAM\\|Chipset Model"`}
              tip="M1/M2/M3/M4 have unified memory — your full RAM is available as VRAM."
            />
            <SpecBlock
              icon={<Cpu className={ICON_CLASS} />}
              label="CPU cores"
              guiPath="Apple menu > About This Mac > chip name (e.g. M2 = 8 cores)"
              command="sysctl -n hw.ncpu"
              tip="Shows total threads. For physical cores: sysctl -n hw.physicalcpu"
            />
            <SpecBlock
              icon={<HardDrive className={ICON_CLASS} />}
              label="Free disk space"
              guiPath="Apple menu > About This Mac > Storage"
              command={`df -h / | awk 'NR==2{print $4" free"}'`}
            />
          </TabsContent>

          {/* Linux */}
          <TabsContent value="linux" className="space-y-4 pt-3">
            <div className="space-y-1 mb-3">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">Quickest way:</span>{" "}
                Run <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">neofetch</Badge> or <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">fastfetch</Badge> for a quick summary of everything.
              </p>
            </div>
            <SpecBlock
              icon={<Database className={ICON_CLASS} />}
              label="RAM"
              guiPath="System Monitor / System Settings > About (varies by distro)"
              command={`free -h | awk '/Mem:/{print $2}'`}
            />
            <SpecBlock
              icon={<Monitor className={ICON_CLASS} />}
              label="VRAM (GPU memory)"
              guiPath="NVIDIA: nvidia-settings > GPU Information"
              command="nvidia-smi --query-gpu=memory.total --format=csv,noheader"
              tip={`AMD: cat /sys/class/drm/card0/device/mem_info_vram_total | awk '{print $0/1073741824"GB"}'`}
            />
            <SpecBlock
              icon={<Cpu className={ICON_CLASS} />}
              label="CPU cores"
              guiPath="System Monitor > Resources, or /proc/cpuinfo"
              command="nproc"
              tip="Physical cores only: lscpu | grep 'Core(s) per socket'"
            />
            <SpecBlock
              icon={<HardDrive className={ICON_CLASS} />}
              label="Free disk space"
              guiPath="Files app > Properties on your drive, or Disks utility"
              command={`df -h / | awk 'NR==2{print $4" free"}'`}
            />
          </TabsContent>
        </Tabs>

        {/* Bottom tips */}
        <div className="mt-2 space-y-2 border-t pt-3">
          <p className="text-[11px] font-semibold text-foreground">Not sure about something?</p>
          <div className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
            <p>
              <span className="font-medium text-foreground">No dedicated GPU?</span>{" "}
              Toggle VRAM off. CPU-only inference works fine for models under ~13B parameters.
            </p>
            <p>
              <span className="font-medium text-foreground">Inference engine?</span>{" "}
              Pick <span className="font-mono text-[10px]">Ollama</span> if you&apos;re not sure — it&apos;s the easiest to set up and works on all platforms.
            </p>
            <p>
              <span className="font-medium text-foreground">Rough estimate is fine.</span>{" "}
              You don&apos;t need exact numbers. Rounding to the nearest 4 GB for RAM/VRAM is close enough.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function SpecsHelperDialogInline() {
  const [defaultOS, setDefaultOS] = useState<"windows" | "macos" | "linux">("windows")

  useEffect(() => {
    setDefaultOS(detectOS())
  }, [])

  return (
    <Dialog>
      <DialogTrigger>
        <button className="inline text-primary underline underline-offset-2 hover:text-primary/80 transition-colors font-medium">
          check this guide
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Finding your hardware specs
          </DialogTitle>
          <DialogDescription>
            Quick ways to find the 4 values you need. Click any command to copy it.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultOS} key={defaultOS}>
          <TabsList className="w-full">
            <TabsTrigger value="windows" className="flex-1 text-xs">Windows</TabsTrigger>
            <TabsTrigger value="macos" className="flex-1 text-xs">macOS</TabsTrigger>
            <TabsTrigger value="linux" className="flex-1 text-xs">Linux</TabsTrigger>
          </TabsList>

          <TabsContent value="windows" className="space-y-4 pt-3">
            <p className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">Quickest way:</span>{" "}
              Open <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">Task Manager</Badge> (Ctrl+Shift+Esc) &gt; Performance tab.
            </p>
            <SpecBlock icon={<Database className={ICON_CLASS} />} label="RAM" guiPath="Settings > System > About > Installed RAM" command={`systeminfo | findstr "Total Physical Memory"`} />
            <SpecBlock icon={<Monitor className={ICON_CLASS} />} label="VRAM" guiPath="Task Manager > Performance > GPU > Dedicated GPU Memory" command="nvidia-smi --query-gpu=memory.total --format=csv,noheader" />
            <SpecBlock icon={<Cpu className={ICON_CLASS} />} label="CPU cores" guiPath="Task Manager > Performance > CPU > Cores" command="echo %NUMBER_OF_PROCESSORS%" />
            <SpecBlock icon={<HardDrive className={ICON_CLASS} />} label="Disk" guiPath="File Explorer > This PC > drive bar" command={`wmic logicaldisk get freespace,caption`} />
          </TabsContent>

          <TabsContent value="macos" className="space-y-4 pt-3">
            <p className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">Quickest way:</span>{" "}
              Apple menu &gt; About This Mac. Apple Silicon VRAM = same as RAM.
            </p>
            <SpecBlock icon={<Database className={ICON_CLASS} />} label="RAM" guiPath="Apple menu > About This Mac > Memory" command={`sysctl -n hw.memsize | awk '{print $0/1073741824" GB"}'`} />
            <SpecBlock icon={<Monitor className={ICON_CLASS} />} label="VRAM" guiPath="Apple Silicon: same as RAM" command={`system_profiler SPDisplaysDataType | grep "VRAM\\|Chipset Model"`} />
            <SpecBlock icon={<Cpu className={ICON_CLASS} />} label="CPU cores" guiPath="Apple menu > About This Mac > chip" command="sysctl -n hw.ncpu" />
            <SpecBlock icon={<HardDrive className={ICON_CLASS} />} label="Disk" guiPath="Apple menu > About This Mac > Storage" command={`df -h / | awk 'NR==2{print $4" free"}'`} />
          </TabsContent>

          <TabsContent value="linux" className="space-y-4 pt-3">
            <p className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">Quickest way:</span>{" "}
              Run <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">neofetch</Badge> or <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">fastfetch</Badge>.
            </p>
            <SpecBlock icon={<Database className={ICON_CLASS} />} label="RAM" guiPath="System Settings > About" command={`free -h | awk '/Mem:/{print $2}'`} />
            <SpecBlock icon={<Monitor className={ICON_CLASS} />} label="VRAM" guiPath="nvidia-settings > GPU Information" command="nvidia-smi --query-gpu=memory.total --format=csv,noheader" />
            <SpecBlock icon={<Cpu className={ICON_CLASS} />} label="CPU cores" guiPath="/proc/cpuinfo or System Monitor" command="nproc" />
            <SpecBlock icon={<HardDrive className={ICON_CLASS} />} label="Disk" guiPath="Files > Properties on drive" command={`df -h / | awk 'NR==2{print $4" free"}'`} />
          </TabsContent>
        </Tabs>

        <div className="mt-2 space-y-2 border-t pt-3">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Rough estimates are fine</span> — rounding to the nearest 4 GB is close enough.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
