"use client";

import * as React from "react";
import {
  createAncestralHall,
  createHallDonation,
  deleteAncestralHall,
  deleteHallDonation,
  deleteHallPhoto,
  getAncestralHallsWithDonations,
  uploadHallPhotos,
  updateAncestralHall,
  type AncestralHall,
} from "./actions";
import { showAlert, showConfirm } from "@/lib/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import * as XLSX from "xlsx";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("zh-CN");
}

export function AncestralHallsClient() {
  const [halls, setHalls] = React.useState<AncestralHall[]>([]);
  const [selectedHallId, setSelectedHallId] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isCreateHallDialogOpen, setIsCreateHallDialogOpen] = React.useState(false);
  const [isEditHallDialogOpen, setIsEditHallDialogOpen] = React.useState(false);
  const [isCreateDonationDialogOpen, setIsCreateDonationDialogOpen] = React.useState(false);
  const [isHonorDialogOpen, setIsHonorDialogOpen] = React.useState(false);

  const [hallName, setHallName] = React.useState("");
  const [hallHistoryIntro, setHallHistoryIntro] = React.useState("");
  const [hallPhotoFiles, setHallPhotoFiles] = React.useState<File[]>([]);
  const [newHallName, setNewHallName] = React.useState("");
  const [newHallHistoryIntro, setNewHallHistoryIntro] = React.useState("");
  const [newHallPhotoFiles, setNewHallPhotoFiles] = React.useState<File[]>([]);

  const [donorName, setDonorName] = React.useState("");
  const [donationAmount, setDonationAmount] = React.useState("");
  const [donationRemarks, setDonationRemarks] = React.useState("");
  const [donatedAt, setDonatedAt] = React.useState("");

  const selectedHall = React.useMemo(
    () => halls.find((item) => item.id === selectedHallId) ?? null,
    [halls, selectedHallId]
  );
  const allDonations = React.useMemo(
    () =>
      halls
        .flatMap((hall) =>
          hall.donations.map((donation) => ({
            hallId: hall.id,
            hallName: hall.name,
            donationId: donation.id,
            donorName: donation.donorName,
            amount: donation.amount,
            donatedAt: donation.donatedAt,
            remarks: donation.remarks,
            createdAt: donation.createdAt,
          }))
        )
        .sort((a, b) => {
          const aTime = new Date(a.donatedAt || a.createdAt).getTime();
          const bTime = new Date(b.donatedAt || b.createdAt).getTime();
          return bTime - aTime;
        }),
    [halls]
  );
  const honorRows = React.useMemo(() => {
    const map = new Map<string, number>();
    allDonations.forEach((item) => {
      const key = item.donorName.trim();
      if (!key) return;
      map.set(key, (map.get(key) || 0) + item.amount);
    });
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [allDonations]);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    const result = await getAncestralHallsWithDonations();
    setIsLoading(false);

    if (!result.success || !result.data) {
      setErrorMessage(result.error || "加载祠堂数据失败");
      setHalls([]);
      setSelectedHallId(null);
      return;
    }

    const data = result.data || [];
    setHalls(data);
    setSelectedHallId((prev) =>
      prev && data.some((item) => item.id === prev) ? prev : data[0]?.id ?? null
    );
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const resetHallForm = () => {
    setHallName("");
    setHallHistoryIntro("");
    setHallPhotoFiles([]);
  };

  const openCreateHall = () => {
    resetHallForm();
    setNewHallName("");
    setNewHallHistoryIntro("");
    setNewHallPhotoFiles([]);
    setErrorMessage(null);
    setIsCreateHallDialogOpen(true);
  };

  const openEditHallDialog = () => {
    if (!selectedHall) return;
    setHallName(selectedHall.name);
    setHallHistoryIntro(selectedHall.historyIntro);
    setHallPhotoFiles([]);
    setErrorMessage(null);
    setIsEditHallDialogOpen(true);
  };

  const handleSubmitHall = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedHall) {
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);

    const result = await updateAncestralHall({
      hallId: selectedHall.id,
      name: hallName,
      historyIntro: hallHistoryIntro,
    });
    if (!result.success) {
      setIsSaving(false);
      setErrorMessage(result.error || "保存祠堂失败");
      return;
    }

    if (hallPhotoFiles.length > 0) {
      const uploadResult = await uploadHallPhotos({ hallId: selectedHall.id, files: hallPhotoFiles });
      if (!uploadResult.success) {
        setIsSaving(false);
        setErrorMessage(uploadResult.error || "上传祠堂照片失败");
        return;
      }
    }

    setIsSaving(false);

    await loadData();
    setHallPhotoFiles([]);
    setIsEditHallDialogOpen(false);
  };

  const handleCreateHallSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    const result = await createAncestralHall({
      name: newHallName,
      historyIntro: newHallHistoryIntro,
    });
    if (!result.success || !result.hallId) {
      setIsSaving(false);
      setErrorMessage(result.error || "创建祠堂失败");
      return;
    }

    if (newHallPhotoFiles.length > 0) {
      const uploadResult = await uploadHallPhotos({
        hallId: result.hallId,
        files: newHallPhotoFiles,
      });
      if (!uploadResult.success) {
        setIsSaving(false);
        setErrorMessage(uploadResult.error || "上传祠堂照片失败");
        return;
      }
    }

    setIsSaving(false);
    setIsCreateHallDialogOpen(false);
    setNewHallName("");
    setNewHallHistoryIntro("");
    setNewHallPhotoFiles([]);
    await loadData();
  };

  const handleCreateDonation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedHall) return;

    setIsSaving(true);
    setErrorMessage(null);

    const result = await createHallDonation({
      hallId: selectedHall.id,
      donorName,
      amount: Number(donationAmount),
      remarks: donationRemarks,
      donatedAt: donatedAt || null,
    });

    setIsSaving(false);
    if (!result.success) {
      setErrorMessage(result.error || "新增捐赠失败");
      return;
    }

    setDonorName("");
    setDonationAmount("");
    setDonationRemarks("");
    setDonatedAt("");
    setIsCreateDonationDialogOpen(false);
    await loadData();
  };

  const handleDeleteDonation = async (donationId: number) => {
    if (!(await showConfirm("确认删除该捐赠记录吗？"))) return;
    setIsSaving(true);
    const result = await deleteHallDonation(donationId);
    setIsSaving(false);
    if (!result.success) {
      setErrorMessage(result.error || "删除捐赠失败");
      return;
    }
    await loadData();
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!(await showConfirm("确认删除这张祠堂照片吗？"))) return;
    setIsSaving(true);
    const result = await deleteHallPhoto(photoId);
    setIsSaving(false);
    if (!result.success) {
      setErrorMessage(result.error || "删除祠堂照片失败");
      return;
    }
    await loadData();
  };

  const handleExportDonationsExcel = () => {
    if (allDonations.length === 0) {
      showAlert("暂无捐赠记录可导出");
      return;
    }

    const exportRows = allDonations.map((item) => ({
      祠堂: item.hallName,
      姓名: item.donorName,
      金额: Number(item.amount.toFixed(2)),
      捐赠日期: item.donatedAt || "",
      备注: item.remarks || "",
      录入时间: formatDateTime(item.createdAt),
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "祠堂捐赠记录");
    XLSX.writeFile(wb, `祠堂捐赠记录-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (isLoading) {
    return <div className="rounded-md border p-6 text-sm text-muted-foreground">正在加载祠堂数据...</div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>祠堂列表</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="button" className="w-full" variant="outline" onClick={openCreateHall}>
            新增祠堂
          </Button>
          <div className="max-h-[56vh] space-y-2 overflow-auto pr-1">
            {halls.map((hall) => (
              <div
                key={hall.id}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  hall.id === selectedHallId ? "border-primary bg-primary/10" : "hover:bg-muted/60"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      setSelectedHallId(hall.id);
                      setErrorMessage(null);
                    }}
                  >
                    <div className="font-medium truncate">{hall.name}</div>
                    <div className="text-xs text-muted-foreground">捐赠记录：{hall.donations.length}</div>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-600"
                    onClick={async (event) => {
                      event.stopPropagation();
                      if (!(await showConfirm(`确认删除祠堂「${hall.name}」及其全部捐赠记录吗？`))) {
                        return;
                      }
                      setIsSaving(true);
                      const result = await deleteAncestralHall(hall.id);
                      setIsSaving(false);
                      if (!result.success) {
                        setErrorMessage(result.error || "删除祠堂失败");
                        return;
                      }
                      resetHallForm();
                      await loadData();
                    }}
                    disabled={isSaving}
                    aria-label={`删除祠堂 ${hall.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {halls.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
                还没有祠堂，请先新增。
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>祠堂信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedHall ? (
              <div className="rounded-md border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-medium">{selectedHall.name}</div>
                  <Button type="button" variant="outline" size="sm" onClick={openEditHallDialog}>
                    编辑祠堂信息
                  </Button>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">更新时间：{formatDateTime(selectedHall.updatedAt)}</div>
                {selectedHall.photos.length > 0 ? (
                  <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
                    {selectedHall.photos.map((photo) => (
                      <div key={photo.id} className="rounded-md border p-2">
                        <img src={photo.photoUrl} alt={selectedHall.name} className="h-32 w-full rounded object-cover" />
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-muted-foreground">{formatDateTime(photo.createdAt)}</span>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeletePhoto(photo.id)}
                            disabled={isSaving}
                          >
                            删除
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
                    暂无祠堂照片
                  </div>
                )}
                <div className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {selectedHall.historyIntro || "暂无历史简介"}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>祠堂捐赠记录</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedHall ? (
              <>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setDonorName("");
                      setDonationAmount("");
                      setDonationRemarks("");
                      setDonatedAt("");
                      setIsCreateDonationDialogOpen(true);
                    }}
                    disabled={isSaving}
                  >
                    新增捐赠记录
                  </Button>
                  <Button type="button" variant="outline" onClick={handleExportDonationsExcel}>
                    导出 Excel
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsHonorDialogOpen(true)}>
                    查看捐赠墙
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    当前祠堂共 {selectedHall.donations.length} 条捐赠记录，全部祠堂共 {allDonations.length} 条。
                  </div>
                </div>

                <div className="rounded-md border">
                  <div className="max-h-[460px] overflow-auto">
                    <div className="min-w-[760px]">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted/60">
                          <tr className="border-b text-left">
                            <th className="px-3 py-2 font-medium">祠堂</th>
                            <th className="px-3 py-2 font-medium">姓名</th>
                            <th className="px-3 py-2 font-medium">金额</th>
                            <th className="px-3 py-2 font-medium">捐赠日期</th>
                            <th className="px-3 py-2 font-medium">备注</th>
                            <th className="px-3 py-2 font-medium">录入时间</th>
                            <th className="px-3 py-2 font-medium text-right">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allDonations.map((item) => (
                            <tr key={item.donationId} className="border-b align-top">
                              <td className="px-3 py-2">{item.hallName}</td>
                              <td className="px-3 py-2">{item.donorName}</td>
                              <td className="px-3 py-2">￥{item.amount.toFixed(2)}</td>
                              <td className="px-3 py-2">{item.donatedAt || "-"}</td>
                              <td className="px-3 py-2 max-w-[280px] whitespace-pre-wrap text-muted-foreground">
                                {item.remarks || "无备注"}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">{formatDateTime(item.createdAt)}</td>
                              <td className="px-3 py-2 text-right">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteDonation(item.donationId)}
                                  disabled={isSaving}
                                >
                                  删除
                                </Button>
                              </td>
                            </tr>
                          ))}
                          {allDonations.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-3 py-10 text-center text-sm text-muted-foreground">
                                暂无捐赠记录
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                请先在左侧选择祠堂，再录入捐赠记录。
              </div>
            )}
          </CardContent>
        </Card>

        {errorMessage ? <div className="text-sm text-red-500">{errorMessage}</div> : null}
      </div>

      <Dialog open={isCreateHallDialogOpen} onOpenChange={setIsCreateHallDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增祠堂</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateHallSubmit}>
            <div className="space-y-2">
              <Label htmlFor="create-hall-name">祠堂名称</Label>
              <Input
                id="create-hall-name"
                value={newHallName}
                onChange={(event) => setNewHallName(event.target.value)}
                placeholder="例如：弥氏宗祠"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-hall-photo">祠堂照片</Label>
              <Input
                id="create-hall-photo"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => setNewHallPhotoFiles(Array.from(event.target.files || []))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-hall-intro">历史简介</Label>
              <Textarea
                id="create-hall-intro"
                rows={5}
                value={newHallHistoryIntro}
                onChange={(event) => setNewHallHistoryIntro(event.target.value)}
                placeholder="填写祠堂历史、沿革、文化简介..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateHallDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "保存中..." : "创建祠堂"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditHallDialogOpen} onOpenChange={setIsEditHallDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑祠堂信息</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmitHall}>
            <div className="space-y-2">
              <Label htmlFor="edit-hall-name">祠堂名称</Label>
              <Input
                id="edit-hall-name"
                value={hallName}
                onChange={(event) => setHallName(event.target.value)}
                placeholder="例如：弥氏宗祠"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-hall-photo">新增祠堂照片</Label>
              <Input
                id="edit-hall-photo"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => setHallPhotoFiles(Array.from(event.target.files || []))}
              />
              <p className="text-xs text-muted-foreground">可一次选择多张照片上传到当前祠堂</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-hall-intro">历史简介</Label>
              <Textarea
                id="edit-hall-intro"
                rows={5}
                value={hallHistoryIntro}
                onChange={(event) => setHallHistoryIntro(event.target.value)}
                placeholder="填写祠堂历史、沿革、文化简介..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditHallDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "保存中..." : "保存祠堂修改"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateDonationDialogOpen} onOpenChange={setIsCreateDonationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增捐赠记录</DialogTitle>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={handleCreateDonation}>
            <div className="space-y-2">
              <Label htmlFor="dialog-donor-name">姓名</Label>
              <Input
                id="dialog-donor-name"
                value={donorName}
                onChange={(event) => setDonorName(event.target.value)}
                placeholder="捐赠人姓名"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dialog-donation-amount">金额</Label>
              <Input
                id="dialog-donation-amount"
                type="number"
                min="0"
                step="0.01"
                value={donationAmount}
                onChange={(event) => setDonationAmount(event.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dialog-donated-at">捐赠日期</Label>
              <Input
                id="dialog-donated-at"
                type="date"
                value={donatedAt}
                onChange={(event) => setDonatedAt(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dialog-donation-remarks">备注</Label>
              <Textarea
                id="dialog-donation-remarks"
                rows={3}
                value={donationRemarks}
                onChange={(event) => setDonationRemarks(event.target.value)}
                placeholder="可填写用途、心愿等备注"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDonationDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "保存中..." : "确认新增"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isHonorDialogOpen} onOpenChange={setIsHonorDialogOpen}>
        <DialogContent className="sm:max-w-[920px] max-h-[84vh] overflow-hidden flex flex-col border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-stone-100">
          <DialogHeader>
            <DialogTitle>捐赠墙</DialogTitle>
          </DialogHeader>
          <div className="mb-2 rounded-lg border border-amber-200 bg-gradient-to-r from-amber-100 via-amber-50 to-stone-100 px-4 py-3">
            <div className="text-base font-semibold text-amber-900">宗祠捐赠芳名录</div>
            <div className="mt-1 text-xs text-amber-800/80">
              汇聚每一份善举，传承家风，泽被后人
            </div>
          </div>
          <div className="flex-1 overflow-auto rounded-lg border border-amber-200/70 bg-gradient-to-b from-white to-amber-50/50 p-4">
            {honorRows.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-white/80 px-4 py-10 text-center text-sm text-muted-foreground">
                暂无可展示的捐赠数据
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {honorRows.map((row, index) => (
                  <div
                    key={`${row.name}-${index}`}
                    className="relative overflow-hidden rounded-xl border border-amber-300/60 bg-gradient-to-b from-white to-amber-50 px-4 py-5 shadow-[0_10px_22px_rgba(120,53,15,0.12)]"
                  >
                    <div className="pointer-events-none absolute -right-5 -top-5 h-16 w-16 rounded-full bg-amber-200/40 blur-xl" />
                    <div className="pointer-events-none absolute -left-6 -bottom-6 h-16 w-16 rounded-full bg-orange-200/35 blur-xl" />
                    <div className="text-center">
                      <div className="text-lg font-semibold tracking-wide text-stone-800">{row.name}</div>
                      <div className="mx-auto mt-2 h-px w-16 bg-amber-300/70" />
                      <div className="mt-3 text-xs tracking-[0.2em] text-amber-700/80">捐赠金额</div>
                      <div className="mt-1 text-2xl font-bold text-amber-700">￥{row.amount.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsHonorDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
