import { useState } from "react";
import { useSummaries } from "@/hooks/useSummaries";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    FileText, Search, Trash2, Clock, Globe, ChevronDown, ChevronUp, RefreshCw, Mic
} from "lucide-react";
import { useLocation } from "wouter";

const langLabels: Record<string, string> = { ar: "عربي", fr: "فرنسي", dz: "دارجة" };

export default function SummariesTab() {
    const { summaries, isLoading, deleteSummary, refetch } = useSummaries();
    const [search, setSearch] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [, navigate] = useLocation();

    const filtered = summaries.filter((s) =>
        !search || s.title?.toLowerCase().includes(search.toLowerCase()) ||
        s.content?.toLowerCase().includes(search.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        await deleteSummary(id);
        setDeletingId(null);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    if (summaries.length === 0) {
        return (
            <div className="text-center py-12 space-y-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <FileText className="h-8 w-8 text-primary/50" />
                </div>
                <h3 className="text-lg font-semibold text-card-foreground">لا توجد تلخيصات بعد</h3>
                <p className="text-sm text-muted-foreground">ابدأ بتسجيل محاضرتك الأولى للحصول على تلخيص</p>
                <Button onClick={() => navigate("/")} className="gap-2">
                    <Mic className="h-4 w-4" />
                    ابدأ تلخيصاً جديداً
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4" dir="rtl">
            {/* Search bar */}
            <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="ابحث في التلخيصات..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pr-10"
                />
            </div>

            <p className="text-xs text-muted-foreground text-right">
                {filtered.length} تلخيص{filtered.length !== 1 ? "ات" : ""}
            </p>

            {/* Summaries list */}
            <div className="space-y-3">
                {filtered.map((s) => (
                    <Card key={s.id} className="shadow-sm border-0 overflow-hidden">
                        <CardContent className="p-4 space-y-2">
                            {/* Header row */}
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-foreground text-sm line-clamp-1">
                                        {s.title || "بدون عنوان"}
                                    </h4>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {new Date(s.created_at).toLocaleDateString("ar-DZ", {
                                                year: "numeric", month: "short", day: "numeric"
                                            })}
                                        </span>
                                        {s.audio_duration && (
                                            <span>{Math.ceil(s.audio_duration / 60)} د</span>
                                        )}
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                            <Globe className="h-2.5 w-2.5 ml-0.5" />
                                            {langLabels[s.language] || s.language}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                                    >
                                        {expandedId === s.id
                                            ? <ChevronUp className="h-4 w-4" />
                                            : <ChevronDown className="h-4 w-4" />}
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent dir="rtl">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>حذف التلخيص؟</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    هذا الإجراء لا يمكن التراجع عنه. سيتم حذف التلخيص نهائياً.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter className="sm:justify-start gap-2">
                                                <AlertDialogAction
                                                    onClick={() => handleDelete(s.id)}
                                                    className="bg-red-600 hover:bg-red-700"
                                                    disabled={deletingId === s.id}
                                                >
                                                    {deletingId === s.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : "حذف"}
                                                </AlertDialogAction>
                                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>

                            {/* Expanded content */}
                            {expandedId === s.id && (
                                <div className="pt-3 border-t">
                                    <Tabs defaultValue="summary" className="w-full">
                                        <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50">
                                            <TabsTrigger value="summary" className="text-xs">الملخص</TabsTrigger>
                                            <TabsTrigger value="transcript" className="text-xs">النص الكامل (التفريغ)</TabsTrigger>
                                        </TabsList>
                                        
                                        <TabsContent value="summary" className="space-y-3 mt-0">
                                            <div>
                                                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                                    {s.content}
                                                </p>
                                            </div>
                                            {s.key_points && s.key_points.length > 0 && (
                                                <div className="pt-3 mt-3 border-t">
                                                    <h5 className="text-xs font-semibold text-muted-foreground mb-2">النقاط الأساسية</h5>
                                                    <ul className="space-y-1">
                                                        {s.key_points.map((p, i) => (
                                                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-1.5">
                                                                <span className="text-primary mt-1">•</span>
                                                                <span>{p}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </TabsContent>
                                        
                                        <TabsContent value="transcript" className="space-y-3 mt-0">
                                            <div className="bg-muted/30 p-3 rounded-lg max-h-[300px] overflow-y-auto border border-border/50">
                                                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                                    {s.transcript || "لا يوجد نص متاح لهذا التسجيل."}
                                                </p>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
