import { useState, useEffect } from "react";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

export default function AdminSettingsTab() {
    const { settings, isLoading, updateSetting, isUpdating } = useAdminSettings();
    const { toast } = useToast();

    const [trialLimits, setTrialLimits] = useState<any>({});
    const [studentLimits, setStudentLimits] = useState<any>({});
    const [proLimits, setProLimits] = useState<any>({});

    useEffect(() => {
        if (settings['TRIAL_LIMITS']) setTrialLimits(settings['TRIAL_LIMITS']);
        if (settings['STUDENT_LIMITS']) setStudentLimits(settings['STUDENT_LIMITS']);
        if (settings['PRO_LIMITS']) setProLimits(settings['PRO_LIMITS']);
    }, [settings]);

    const handleSave = async (key: string, value: any, description: string) => {
        try {
            await updateSetting({ key, value, description });
            toast({
                title: "تم الحفظ بنجاح",
                description: "تم تحديث إعدادات النظام",
            });
        } catch (error: any) {
            toast({
                title: "خطأ",
                description: error.message || "فشل حفظ الإعدادات",
                variant: "destructive",
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Trial Plan Limits */}
            <Card className="shadow-sm border-0">
                <CardHeader className="pb-3 border-b text-right flex flex-col items-end">
                    <CardTitle className="text-base font-semibold text-card-foreground w-full text-right flex flex-row-reverse items-center gap-2">التجربة المجانية (Trial)</CardTitle>
                    <CardDescription className="w-full text-right">إعدادات وقيود الحسابات المجانية الجديدة.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4 text-right">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="rtl">
                        <div className="space-y-2">
                            <Label>الحد الأقصى الإجمالي (دقائق)</Label>
                            <Input
                                type="number"
                                value={trialLimits.MAX_AUDIO_MINUTES || ''}
                                onChange={e => setTrialLimits({ ...trialLimits, MAX_AUDIO_MINUTES: Number(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>الحد اليومي (دقائق)</Label>
                            <Input
                                type="number"
                                value={trialLimits.DAILY_LIMIT_MINUTES || ''}
                                onChange={e => setTrialLimits({ ...trialLimits, DAILY_LIMIT_MINUTES: Number(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>مدة الصلاحية (أيام)</Label>
                            <Input
                                type="number"
                                value={trialLimits.VALIDITY_DAYS || ''}
                                onChange={e => setTrialLimits({ ...trialLimits, VALIDITY_DAYS: Number(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>أقصى مدة للملف الواحد (ثواني)</Label>
                            <Input
                                type="number"
                                value={trialLimits.MAX_FILE_DURATION_SECONDS || ''}
                                onChange={e => setTrialLimits({ ...trialLimits, MAX_FILE_DURATION_SECONDS: Number(e.target.value) })}
                            />
                            <p className="text-xs text-muted-foreground">{trialLimits.MAX_FILE_DURATION_SECONDS / 60} دقيقة</p>
                        </div>
                    </div>
                    <Button
                        disabled={isUpdating}
                        onClick={() => handleSave('TRIAL_LIMITS', trialLimits, 'Trial plan limits')}
                        className="w-full md:w-auto"
                    >
                        <Save className="h-4 w-4 ml-2" />
                        حفظ إعدادات التجربة المجانية
                    </Button>
                </CardContent>
            </Card>

            {/* Student Plan Limits */}
            <Card className="shadow-sm border-0">
                <CardHeader className="pb-3 border-b text-right flex flex-col items-end">
                    <CardTitle className="text-base font-semibold text-purple-700 w-full text-right flex flex-row-reverse items-center gap-2">خطة الطالب (Student)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4 text-right">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="rtl">
                        <div className="space-y-2">
                            <Label>الحد اليومي (دقائق)</Label>
                            <Input
                                type="number"
                                value={studentLimits.DAILY_LIMIT_MINUTES || ''}
                                onChange={e => setStudentLimits({ ...studentLimits, DAILY_LIMIT_MINUTES: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                    <Button
                        disabled={isUpdating}
                        onClick={() => handleSave('STUDENT_LIMITS', studentLimits, 'Student plan daily limits')}
                        className="w-full md:w-auto bg-purple-600 hover:bg-purple-700"
                    >
                        <Save className="h-4 w-4 ml-2" />
                        حفظ إعدادات الطالب
                    </Button>
                </CardContent>
            </Card>

            {/* Professional Plan Limits */}
            <Card className="shadow-sm border-0">
                <CardHeader className="pb-3 border-b text-right flex flex-col items-end">
                    <CardTitle className="text-base font-semibold text-amber-700 w-full text-right flex flex-row-reverse items-center gap-2">خطة المحترف (Professional)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4 text-right">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="rtl">
                        <div className="space-y-2">
                            <Label>الحد اليومي (دقائق)</Label>
                            <Input
                                type="number"
                                value={proLimits.DAILY_LIMIT_MINUTES || ''}
                                onChange={e => setProLimits({ ...proLimits, DAILY_LIMIT_MINUTES: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                    <Button
                        disabled={isUpdating}
                        onClick={() => handleSave('PRO_LIMITS', proLimits, 'Professional plan daily limits')}
                        className="w-full md:w-auto bg-amber-600 hover:bg-amber-700"
                    >
                        <Save className="h-4 w-4 ml-2" />
                        حفظ إعدادات المحترف
                    </Button>
                </CardContent>
            </Card>

        </div>
    );
}
