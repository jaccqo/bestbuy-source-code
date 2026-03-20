"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  GripVertical,
  MoreHorizontal,
  ColumnsIcon,
  Download,
  RefreshCcw,
  Trash2,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  TrendingUp,
  Copy,
  Eye,
  AlertCircle,
  Check,
  ListRestart,
  Clock,
  X,
  BrushCleaning
} from "lucide-react"

import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell
} from "@/components/ui/table"

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from "@/components/ui/select"

import { Label } from "@/components/ui/label"
import { Sheet, SheetTrigger } from "@/components/ui/sheet"
import { ScraperDetailSheet } from "@/components/dashboard/ScraperDetailSheet"
import { cn } from "@/lib/utils"
import { CSS } from "@dnd-kit/utilities"

import {
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DndContext,
  closestCenter,
} from "@dnd-kit/core"

import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"


import { useDebounce } from "@/hooks/use-debounce"
import { useForensics } from "@/hooks/use-forensics"
import { exportTableData } from "@/hooks/export-table-data"
import { useRescrapeFailed } from "@/hooks/use-scrape-failed"

import { open as openExternal } from "@tauri-apps/plugin-shell"

interface ConfirmClearButtonProps {
  onConfirm: () => void;
}

export function ConfirmClearButton({ onConfirm }: ConfirmClearButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-700/30 hover:text-neutral-400 border-none"
        >
          <Trash2 className="size-4" /> Clear Table
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete all records from the backend and wipe your current dashboard view. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Continue & Clear
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/* -------------------------------------------------------------------------- */
/* DRAGGABLE ROW                                                             */
/* -------------------------------------------------------------------------- */

interface DraggableRowProps {
  row: any
}

const DraggableRow = React.memo(function DraggableRow({ row }: DraggableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 10 : 1,
    position: "relative",
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn("group transition-colors", isDragging && "bg-muted/80 shadow-2xl border-primary/20")}
    >
      {row.getVisibleCells().map((cell: any) => (
        <TableCell key={cell.id} className="py-2">
          {cell.column.id === "drag" ? (
            <div
              {...attributes}
              {...listeners}
              className="flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-primary transition-colors p-2"
            >
              <GripVertical className="size-4" />
            </div>
          ) : (
            flexRender(cell.column.columnDef.cell, cell.getContext())
          )}
        </TableCell>
      ))}
    </TableRow>
  )
})

/* -------------------------------------------------------------------------- */
/* SCHEMA                                                                    */
/* -------------------------------------------------------------------------- */

export const schema = z.object({
  sku: z.string(),
  title: z.string(),
  brand: z.string(),
  price: z.number(),
  status: z.string(),
  source_url: z.string().nullable(),
  scraped_at: z.string(),
})

export type ScraperEntry = z.infer<typeof schema>

/* -------------------------------------------------------------------------- */
/* ROW ACTIONS                                                                */
/* -------------------------------------------------------------------------- */

const RowActions = React.memo(function RowActions({ item }: { item: ScraperEntry }) {
  const [isCopied, setIsCopied] = React.useState(false)
  const { removeItem } = useForensics()

  const handleCopy = () => {
    navigator.clipboard.writeText(item.sku)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 1500)
  }

  return (
    <Sheet>
      <AlertDialog>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="size-8 p-0 hover:bg-indigo-500/10 transition-colors">
              <MoreHorizontal className="size-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-50 w-52 overflow-hidden rounded-xl p-3 border border-neutral-400/40 dark:border-indigo-500/20 bg-white/50 dark:bg-neutral-950/30 backdrop-blur-2xl">
            <DropdownMenuLabel className="px-2 py-1 text-[9px] font-bold tracking-widest text-muted-foreground/60 uppercase">
              Actions
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="mx-1 bg-neutral-300 dark:bg-neutral-700" />

            <SheetTrigger asChild>
              <DropdownMenuItem className="rounded-lg gap-2 cursor-pointer py-1.5">
                <Eye className="size-3.5 text-indigo-500" /> <span className="font-medium">View Details</span>
              </DropdownMenuItem>
            </SheetTrigger>

            <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={handleCopy} className="rounded-lg gap-2 py-1.5 cursor-pointer">
              {isCopied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              <span className={isCopied ? "text-emerald-500 font-semibold" : ""}>{isCopied ? "Copied!" : "Copy SKU"}</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="mx-1 bg-neutral-300 dark:bg-neutral-700" />

            <AlertDialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="rounded-lg gap-2 py-1.5 text-rose-500 focus:bg-rose-500/10 focus:text-rose-500 cursor-pointer">
                <Trash2 className="size-3.5" /> <span className="font-medium">Remove</span>
              </DropdownMenuItem>
            </AlertDialogTrigger>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the item with SKU: <strong>{item.sku}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => removeItem(item.sku)} className="bg-rose-500 hover:bg-rose-600">
              Confirm Removal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ScraperDetailSheet item={item} />
    </Sheet>
  )
})

/* -------------------------------------------------------------------------- */
/* COLUMNS                                                                    */
/* -------------------------------------------------------------------------- */

export const columns: ColumnDef<ScraperEntry>[] = [
  { id: "drag", header: "", size: 40, cell: () => <div className="flex items-center justify-center cursor-grab text-muted-foreground/40 hover:text-primary transition-colors"><GripVertical className="size-4" /></div> },
  { accessorKey: "sku", header: "SKU", enableGlobalFilter:true, cell: ({ row }) => <span className="bg-muted px-2 py-0.5 rounded text-[10px] font-mono font-medium text-muted-foreground border border-border/50">{row.original.sku}</span> },
  { accessorKey: "title", header: "Product", enableGlobalFilter:true, size: 300, minSize:200, cell: ({ row }) => <div className="flex flex-col gap-0 py-1"><span className="text-[13px] font-normal leading-tight text-foreground max-w-[200px]">{row.original.title}</span><div className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold">Best Buy</div></div> },
  { accessorKey: "brand", header: "Brand", enableGlobalFilter:true, cell: ({ row }) => <Badge variant="secondary" className="font-bold text-[10px] uppercase tracking-wider px-1.5 py-0">{row.original.brand}</Badge> },
  { accessorKey: "price", header: () => <div className="text-right">Price</div>, cell: ({ row }) => <div className="flex flex-col items-end gap-1"><span className="font-mono font-bold text-sm">${row.original.price}</span><div className="flex items-center gap-1 text-[10px] text-green-500 font-medium"><TrendingUp className="size-3"/>Live</div></div> },
  {
    accessorKey: "status",
    header: "Status",
    enableGlobalFilter: true,
    cell: ({ row }) => {
      const s = row.original.status.toLowerCase();

      const config = {
        success: { color: "bg-green-500/10 text-green-500", icon: <CheckCircle2 className="size-3 stroke-[3px]" />, label: "SUCCESS" },
        scraping: { color: "bg-fuchsia-500/10 text-fuchsia-400", icon: <Loader2 className="size-3 animate-spin" />, label: "SCRAPING" },
        queued: { color: "bg-amber-500/10 text-amber-500", icon: <Clock className="size-3" />, label: "QUEUED" },
        failed: { color: "bg-red-500/10 text-red-500", icon: <AlertCircle className="size-3" />, label: "FAILED" },
        cleaning: { color: "bg-sky-500/10 text-sky-500", icon: <BrushCleaning className="size-3" />, label: "CLEANING" },
      };

      let current = config.failed; 
      if (s.includes("success")) current = config.success;
      else if (s.includes("scraping") || s.includes("preparing") || s.includes("running")) current = config.scraping;
      else if (s.includes("queued") || s.includes("pending")) current = config.queued;
      else if (s.includes("cleaning") || s.includes("cleaning")) current = config.cleaning;
      // Add an explicit check for failed to be safe
      else if (s.includes("failed") || s.includes("error")) current = config.failed;

      return (
        <Badge 
          variant="outline" 
          className={cn("flex gap-1.5 items-center px-2 py-0.5 border-none", current.color)}
        >
          {current.icon}
          <span className="text-[11px] font-bold tracking-wider">
            {current.label}
          </span>
        </Badge>
      );
    }
  },
  { accessorKey:"scraped_at", header:"Scraped", cell:({ row }) => {
      const date = new Date(row.original.scraped_at)
      return <div className="flex flex-col text-[11px]"><span className="text-foreground font-medium">{date.toLocaleDateString()}</span><span className="text-muted-foreground/70">{date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></div>
    }
  },
  {
    accessorKey: "source_url",
    header: "Source",
    cell: ({ row }) => {
      const url = row.original.source_url

      return url ? (
        <button
          onClick={() => openExternal(url)}
          className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-500 px-2 py-1 rounded hover:bg-blue-500/20 transition-all text-[10px] font-bold uppercase tracking-tight"
        >
          View <ExternalLink className="size-3" />
        </button>
      ) : (
        <span className="text-muted-foreground text-[10px]">N/A</span>
      )
    }
  },
  { id:"actions", header:"", cell:({ row }) => <div className="flex justify-end pr-2"><RowActions item={row.original}/></div> }
]

/* -------------------------------------------------------------------------- */
/* DATA TABLE                                                                 */
/* -------------------------------------------------------------------------- */

export function DataTable() {
  const [globalFilter, setGlobalFilter] = React.useState("")
  const debouncedFilter = useDebounce(globalFilter, 300)
  const { data, clearTable } = useForensics()

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [pagination, setPagination] = React.useState({ pageIndex:0, pageSize:10 })

  const memoColumns = React.useMemo(() => columns, [])

  const { rescrapeFailed, loading } = useRescrapeFailed();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint:{ distance:5 } }),
    useSensor(KeyboardSensor)
  )

  const table = useReactTable({
    data,
    columns:memoColumns,
    autoResetPageIndex: false,
    state:{ sorting, columnFilters, columnVisibility, pagination, globalFilter:debouncedFilter },
    onGlobalFilterChange:setGlobalFilter,
    onSortingChange:setSorting,
    onColumnFiltersChange:setColumnFilters,
    onColumnVisibilityChange:setColumnVisibility,
    onPaginationChange:setPagination,
    getCoreRowModel:getCoreRowModel(),
    getFilteredRowModel:getFilteredRowModel(),
    getSortedRowModel:getSortedRowModel(),
    getPaginationRowModel:getPaginationRowModel(),
    getRowId:(row:any)=>row.sku
  })

  const rows = table.getRowModel().rows
  const rowIds = React.useMemo(()=>rows.map(row=>row.id), [rows])
  const isSortingActive = sorting.length > 0
  const isFiltering = globalFilter.length > 0

  

  const handleDragEnd = (event:DragEndEvent)=>{
    const {active, over} = event
    if(active && over && active.id !== over.id){
      // optional reorder logic
    }
  }

    const handleExportAllPages = async () => {
    // Get all rows after filtering & sorting, but BEFORE pagination
  const allRows = table.getSortedRowModel().rows.map(r => r.original)

    // Only include visible columns
    const headers = table
      .getAllColumns()
      .filter(c => c.getIsVisible())
      .map(c => c.id)

    await exportTableData(allRows, headers, "CSV")
  }


  return (
    <div className="space-y-4">
      {/* Top controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4">
        <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">

          <div className="relative w-full ">
            <Input
              placeholder="Search SKU, product, Brand, or status..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="h-9 pr-8" // Add right padding so text doesn't go under the X
            />
            {globalFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
                onClick={() => setGlobalFilter("")}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Clear search</span>
              </Button>
            )}
          </div>
        <Select
            value={(table.getColumn("status")?.getFilterValue() as string) ?? "all"}
            onValueChange={(value) => table.getColumn("status")?.setFilterValue(value === "all" ? "" : value)}
        >
            <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="scraping">Scraping</SelectItem>
            <SelectItem value="Failed">Failed</SelectItem>
            </SelectContent>
        </Select>
        
        <ConfirmClearButton onConfirm={clearTable} />

                {/* 🔹 Rescrape All button only shows when "Failed" is selected */}
          {table.getColumn("status")?.getFilterValue() === "Failed" && (
            <Button
              variant="destructive"
              size="sm"
              disabled={loading}
              className="h-9 gap-2 
                bg-gradient-to-r from-rose-500 via-orange-500 to-amber-400
                hover:from-rose-600 hover:via-orange-600 hover:to-amber-500
                text-white 
                shadow-lg shadow-rose-900/40 
                border-none 
                transition-all duration-300
                disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={() => {
                rescrapeFailed();
              }}
            >
              <RefreshCcw
                className={`size-4 ${loading ? "animate-spin" : ""}`}
              />
              {loading ? "Rescraping..." : "Rescrape All"}
            </Button>
          )}

        {table.getState().columnFilters.length > 0 && (
            <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-9 px-2 text-xs text-muted-foreground">
            <RefreshCcw className="mr-2 size-3" /> Reset
            </Button>
        )}
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-end">
        <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportAllPages} 
            className="h-9 gap-2 bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 
                    hover:from-emerald-600 hover:via-teal-700 hover:to-cyan-700 
                    text-white shadow-lg shadow-emerald-900/30 border-none transition-all duration-300"
        >
            <Download className="mr-2 size-4" />
            Export
        </Button>
        <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-9"><ColumnsIcon className="mr-2 size-4"/> Columns</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
            {table.getAllColumns().filter(c => c.getCanHide()).map((column) => (
                <DropdownMenuCheckboxItem key={column.id} checked={column.getIsVisible()} onCheckedChange={(v) => column.toggleVisibility(!!v)}>
                {column.id.replace("_", " ")}
                </DropdownMenuCheckboxItem>
            ))}
            </DropdownMenuContent>
        </DropdownMenu>
        </div>
    </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="rounded-lg border overflow-hidden bg-card">
          <Table>
            <TableHeader className="bg-muted/50">
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(header=>(
                    <TableHead key={header.id} onClick={header.column.getToggleSortingHandler()}>
                      <div className="flex items-center gap-2 cursor-pointer select-none">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              <SortableContext items={rowIds} strategy={verticalListSortingStrategy} disabled={isSortingActive || isFiltering}>
                {rows.length ? rows.map(row => <DraggableRow key={row.id} row={row}/>) :
                  <TableRow><TableCell colSpan={columns.length} className="text-center h-24">No results found.</TableCell></TableRow>}
              </SortableContext>
            </TableBody>
          </Table>
        </div>
      </DndContext>
       
        {/* Pagination controls */}
       <div className="flex items-center justify-between px-4 pb-4">
            <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Rows</Label>
            <Select value={`${table.getState().pagination.pageSize}`} onValueChange={(value) => table.setPageSize(Number(value))}>
                <SelectTrigger className="w-[70px] h-8 text-xs"><SelectValue/></SelectTrigger>
                <SelectContent>
                {[10, 20, 30, 40].map((size) => <SelectItem key={size} value={`${size}`}>{size}</SelectItem>)}
                </SelectContent>
            </Select>
            </div>
            <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="size-8" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}><ChevronsLeft className="size-4"/></Button>
            <Button variant="outline" size="icon" className="size-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><ChevronLeft className="size-4"/></Button>
            <div className="px-2 text-xs font-medium">{table.getState().pagination.pageIndex + 1} / {table.getPageCount()}</div>
            <Button variant="outline" size="icon" className="size-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><ChevronRight className="size-4"/></Button>
            <Button variant="outline" size="icon" className="size-8" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}><ChevronsRight className="size-4"/></Button>
            </div>
        </div>

     
    </div>
  )
}