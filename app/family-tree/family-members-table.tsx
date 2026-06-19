"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { showAlert, showConfirm } from "@/lib/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { FamilyMember } from "./actions";
import {
  createFamilyMember,
  updateFamilyMember,
  deleteFamilyMembers,
  fetchAllMembersForSelect,
  fetchMemberById,
  fetchAllMembersForCsv,
} from "./actions";
import { uploadFile } from "@/lib/supabase/storage";
import { ImportMembersDialog } from "./import-members-dialog";
import { FatherCombobox } from "./father-combobox";
import { RichTextEditor } from "@/components/rich-text/editor";
import { cn } from "@/lib/utils";
import { createShareLink } from "@/app/share/actions";

interface FamilyMembersTableProps {
  initialData: FamilyMember[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  searchQuery: string;
}

export function FamilyMembersTable({
  initialData,
  totalCount,
  currentPage,
  pageSize,
  searchQuery,
}: FamilyMembersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [searchInput, setSearchInput] = React.useState(searchQuery);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoadingParents, setIsLoadingParents] = React.useState(false);
  const [loadingFatherId, setLoadingFatherId] = React.useState<number | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = React.useState(false);
  const [shareLink, setShareLink] = React.useState<string>("");
  const [shareExpiresAt, setShareExpiresAt] = React.useState<string | null>(null);
  const [isCreatingShare, setIsCreatingShare] = React.useState(false);
  const [shareDays, setShareDays] = React.useState("7");
  const [isExportingCsv, setIsExportingCsv] = React.useState(false);

  const [editingMember, setEditingMember] = React.useState<FamilyMember | null>(null);  const [parentOptions, setParentOptions] = React.useState<
    { id: number; name: string; generation: number | null }[]
  >([]);

  // 新增表单状态
  const [formData, setFormData] = React.useState({
    name: "",
    generation: "",
    sibling_order: "",
    father_id: "",
    gender: "",
    official_position: "",
    is_alive: true,
    spouse: "",
    spouse_id: "null",
    remarks: "",
    birthday: "",
    death_date: "",
    burial_place: "",
    residence_place: "",
    contact: "",
    avatar: "",
  });

  // 文件上传状态
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const totalPages = Math.ceil(totalCount / pageSize);

  // 判断是否为编辑模式
  const isEditMode = editingMember !== null;

  // 加载父亲选择列表
  React.useEffect(() => {
    if (isDialogOpen) {
      setIsLoadingParents(true);
      fetchAllMembersForSelect()
        .then(setParentOptions)
        .finally(() => setIsLoadingParents(false));
    }
  }, [isDialogOpen]);

  const updateUrlParams = (params: Record<string, string>) => {
    startTransition(() => {
      const newParams = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          newParams.set(key, value);
        } else {
          newParams.delete(key);
        }
      });
      router.push(`/family-tree?${newParams.toString()}`);
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrlParams({ search: searchInput, page: "1" });
  };

  const handlePageChange = (newPage: number) => {
    updateUrlParams({ page: newPage.toString() });
  };

  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    const result = await fetchAllMembersForCsv();
    setIsExportingCsv(false);

    if (result.error) {
      showAlert(`导出失败: ${result.error}`);
      return;
    }

    const headers = [
      "ID",
      "姓名",
      "世代",
      "排行",
      "父亲ID",
      "性别",
      "官职",
      "是否在世",
      "配偶",
      "配偶ID",
      "生日",
      "卒年",
      "埋葬地点",
      "简介",
      "居住地",
      "联系方式",
      "头像",
      "更新时间",
    ];

    const rows = result.data.map((member) => [
      member.id,
      member.name,
      member.generation ?? "",
      member.sibling_order ?? "",
      member.father_id ?? "",
      member.gender ?? "",
      member.official_position ?? "",
      member.is_alive ? "是" : "否",
      member.spouse ?? "",
      member.spouse_id ?? "",
      member.birthday ?? "",
      member.death_date ?? "",
      member.burial_place ?? "",
      member.remarks ?? "",
      member.residence_place ?? "",
      member.contact ?? "",
      member.avatar ?? "",
      member.updated_at ?? "",
    ]);

    const escapeCell = (value: string | number) => {
      const text = String(value ?? "");
      if (/[\",\n]/.test(text)) {
        return `"${text.replace(/\"/g, "\"\"")}"`;
      }
      return text;
    };

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCell).join(","))
      .join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `family-members-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateShareLink = async () => {
    setIsCreatingShare(true);
    const days = shareDays ? parseInt(shareDays, 10) : 7;
    const result = await createShareLink(Number.isNaN(days) ? 7 : days);
    if (result && typeof window !== "undefined") {
      setShareLink(`${window.location.origin}/share/${result.token}`);
      setShareExpiresAt(result.expires_at);
    } else {
      showAlert("生成分享链接失败");
    }
    setIsCreatingShare(false);
  };

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      // 生成预览
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 处理文件上传
  const handleFileUpload = async (file: File): Promise<string | null> => {
    try {
      setIsUploading(true);
      // 使用 Supabase 存储上传文件
      const uploadedUrl = await uploadFile(file);
      return uploadedUrl;
    } catch (error) {
      console.error("文件上传失败:", error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(initialData.map((m) => m.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = await showConfirm(
      `确定要删除选中的 ${selectedIds.size} 条记录吗？`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    const result = await deleteFamilyMembers(Array.from(selectedIds));
    setIsDeleting(false);

    if (result.success) {
      setSelectedIds(new Set());
      router.refresh();
    } else {
      showAlert(`删除失败: ${result.error}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      generation: "",
      sibling_order: "",
      father_id: "",
      gender: "",
      official_position: "",
      is_alive: true,
      spouse: "",
      spouse_id: "null",
      remarks: "",
      birthday: "",
      death_date: "",
      burial_place: "",
      residence_place: "",
      contact: "",
      avatar: "",
    });
    setAvatarFile(null);
    setAvatarPreview(null);
    setEditingMember(null);
  };

  // 打开新增弹窗
  const handleOpenAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  // 打开编辑弹窗
  const handleOpenEditDialog = (member: FamilyMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      generation: member.generation?.toString() ?? "",
      sibling_order: member.sibling_order?.toString() ?? "",
      father_id: member.father_id?.toString() ?? "null",
      gender: member.gender ?? "",
      official_position: member.official_position ?? "",
      is_alive: member.is_alive,
      spouse: member.spouse ?? "",
      spouse_id: member.spouse_id?.toString() ?? "null",
      remarks: member.remarks ?? "",
      birthday: member.birthday ?? "",
      death_date: member.death_date ?? "",
      burial_place: member.burial_place ?? "",
      residence_place: member.residence_place ?? "",
      contact: member.contact ?? "",
      avatar: member.avatar ?? "",
    });
    setIsDialogOpen(true);
  };

  // 关闭弹窗
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmitMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showAlert("请输入姓名");
      return;
    }

    setIsSubmitting(true);

    // 处理文件上传
    let avatarUrl = formData.avatar;
    if (avatarFile) {
      const uploadedUrl = await handleFileUpload(avatarFile);
      if (uploadedUrl) {
        avatarUrl = uploadedUrl;
      }
    }

    const memberData = {
      name: formData.name.trim(),
      generation: formData.generation ? parseInt(formData.generation) : null,
      sibling_order: formData.sibling_order
        ? parseInt(formData.sibling_order)
        : null,
      father_id: (formData.father_id && formData.father_id !== "null") 
        ? parseInt(formData.father_id) 
        : null,
      gender: (formData.gender as "男" | "女") || null,
      official_position: formData.official_position || null,
      is_alive: formData.is_alive,
      spouse: formData.spouse || null,
      spouse_id:
        formData.spouse_id && formData.spouse_id !== "null"
          ? parseInt(formData.spouse_id, 10)
          : null,
      remarks: formData.remarks || null,
      birthday: formData.birthday || null,
      death_date: (!formData.is_alive && formData.death_date) ? formData.death_date : null,
      burial_place: (!formData.is_alive && formData.burial_place) ? formData.burial_place : null,
      residence_place: formData.residence_place || null,
      contact: formData.contact || null,
      avatar: avatarUrl || null,
    };

    const result = isEditMode && editingMember
      ? await updateFamilyMember({ ...memberData, id: editingMember.id })
      : await createFamilyMember(memberData);

    setIsSubmitting(false);

    if (result.success) {
      handleCloseDialog();
      router.refresh();
    } else {
      showAlert(`${isEditMode ? "更新" : "添加"}失败: ${result.error}`);
    }
  };

  const allSelected =
    initialData.length > 0 && selectedIds.size === initialData.length;
  const spouseOptions = React.useMemo(
    () =>
      parentOptions.filter((option) => {
        if (!editingMember) return true;
        return option.id !== editingMember.id;
      }),
    [parentOptions, editingMember]
  );

  const formatDateDisplay = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const [y, m, d] = dateStr.split("-");
    return `${y}年${m}月${d}日`;
  };

  const getPlainText = (value: string | null) => {
    if (!value) return "-";
    return value
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "-";
  };

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        {/* 搜索 */}
        <form onSubmit={handleSearch} className="flex gap-2 w-full lg:w-auto">
          <Input
            placeholder="搜索姓名..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full sm:w-64"
          />
          <Button type="submit" variant="outline" size="icon" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </form>

        {/* 操作按钮 */}
        <div className="flex gap-2 flex-wrap w-full lg:w-auto">
          <ImportMembersDialog onSuccess={() => router.refresh()} />
          
          <Button onClick={handleOpenAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            新增
          </Button>
          <Button variant="outline" onClick={handleExportCsv} disabled={isExportingCsv}>
            {isExportingCsv ? "导出中..." : "导出CSV"}
          </Button>
          <Button variant="outline" onClick={() => setIsShareDialogOpen(true)}>
            生成分享链接
          </Button>

          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={selectedIds.size === 0 || isDeleting}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
            删除 {selectedIds.size > 0 && `(${selectedIds.size})`}
          </Button>
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent 
          className="sm:max-w-[1120px] max-h-[90vh] flex flex-col p-0 gap-0"
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>{isEditMode ? "编辑成员" : "新增成员"}</DialogTitle>
            <DialogDescription>
              填写成员信息后点击保存
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmitMember} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
                {isEditMode && (avatarPreview || formData.avatar) ? (
                  <div className="flex justify-center lg:col-span-2">
                    <div className="w-24 h-24 rounded-full overflow-hidden border border-stone-300 dark:border-stone-600 bg-stone-100 dark:bg-stone-800">
                      <img
                        src={avatarPreview || formData.avatar}
                        alt={`${formData.name}头像`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                ) : null}
                {/* 姓名 */}
                <div className="grid grid-cols-5 items-center gap-4">
                  <Label htmlFor="name" className="text-right col-span-1">
                    姓名 *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="col-span-4"
                    required
                  />
                </div>

                {/* 父亲 */}
                <div className="grid grid-cols-5 items-center gap-4">
                  <Label htmlFor="father_id" className="text-right col-span-1">
                    父亲
                  </Label>
                  <div className="col-span-4">
                    <FatherCombobox
                      value={formData.father_id}
                      options={parentOptions}
                      isLoading={isLoadingParents}
                      onChange={(value) => {
                        const father = parentOptions.find(p => p.id.toString() === value);
                        const newGeneration = father && father.generation !== null 
                          ? (father.generation + 1).toString() 
                          : (value === "null" ? "" : formData.generation);
                        setFormData({ 
                          ...formData, 
                          father_id: value, 
                          generation: newGeneration 
                        });
                      }}
                    />
                  </div>
                </div>

                {/* 世代 */}
                <div className="grid grid-cols-5 items-center gap-4">
                  <Label htmlFor="generation" className="text-right col-span-1">
                    世代
                  </Label>
                  <Input
                    id="generation"
                    type="number"
                    value={formData.generation}
                    onChange={(e) =>
                      setFormData({ ...formData, generation: e.target.value })
                    }
                    className="col-span-4"
                    disabled={!!formData.father_id && formData.father_id !== "null"}
                  />
                </div>

                {/* 排行 */}
                <div className="grid grid-cols-5 items-center gap-4">
                  <Label htmlFor="sibling_order" className="text-right col-span-1">
                    排行
                  </Label>
                  <Input
                    id="sibling_order"
                    type="number"
                    value={formData.sibling_order}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sibling_order: e.target.value,
                      })
                    }
                    className="col-span-4"
                  />
                </div>

                {/* 性别 */}
                <div className="grid grid-cols-5 items-center gap-4">
                  <Label htmlFor="gender" className="text-right col-span-1">
                    性别
                  </Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) =>
                      setFormData({ ...formData, gender: value })
                    }
                  >
                    <SelectTrigger className="col-span-4">
                      <SelectValue placeholder="选择性别" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="男">男</SelectItem>
                      <SelectItem value="女">女</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 生日 */}
                <div className="grid grid-cols-5 items-center gap-4">
                  <Label htmlFor="birthday" className="text-right col-span-1">
                    生日
                  </Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={formData.birthday}
                    onChange={(e) =>
                      setFormData({ ...formData, birthday: e.target.value })
                    }
                    className="col-span-4"
                  />
                </div>

                {/* 居住地 */}
                <div className="grid grid-cols-5 lg:grid-cols-10 items-center gap-4 lg:col-span-2">
                  <Label htmlFor="residence_place" className="text-right col-span-1">
                    居住地
                  </Label>
                  <Input
                    id="residence_place"
                    value={formData.residence_place}
                    onChange={(e) =>
                      setFormData({ ...formData, residence_place: e.target.value })
                    }
                    className="col-span-4 lg:col-span-9"
                  />
                </div>

                {/* 联系方式 */}
                <div className="grid grid-cols-5 lg:grid-cols-10 items-center gap-4 lg:col-span-2">
                  <Label htmlFor="contact" className="text-right col-span-1">
                    联系方式
                  </Label>
                  <Input
                    id="contact"
                    value={formData.contact}
                    onChange={(e) =>
                      setFormData({ ...formData, contact: e.target.value })
                    }
                    className="col-span-4 lg:col-span-9"
                    placeholder="手机号/微信/邮箱等"
                  />
                </div>

                {/* 头像 */}
                <div className="grid grid-cols-5 lg:grid-cols-10 items-start gap-4 lg:col-span-2">
                  <Label htmlFor="avatar" className="text-right pt-2 col-span-1">
                    头像
                  </Label>
                  <div className="col-span-4 lg:col-span-9 space-y-2">
                    {/* 文件上传控件 */}
                    <div className="flex items-center gap-2">
                      <Input
                        id="avatar-file"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="col-span-4"
                      />
                      {avatarFile && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAvatarFile(null);
                            setAvatarPreview(null);
                          }}
                        >
                          取消
                        </Button>
                      )}
                    </div>
                    
                    {/* 头像预览 */}
                    {avatarPreview && (
                      <div className="mt-2">
                        <img 
                          src={avatarPreview} 
                          alt="头像预览" 
                          className="w-20 h-20 object-cover rounded-full border border-stone-300 dark:border-stone-600"
                        />
                      </div>
                    )}
                    
                    {/* 或者输入 URL */}
                    <div className="mt-2">
                      <Label htmlFor="avatar-url" className="text-sm text-stone-500 dark:text-stone-400 mb-1 block">
                        或者输入头像 URL
                      </Label>
                      <Input
                        id="avatar-url"
                        value={formData.avatar}
                        onChange={(e) =>
                          setFormData({ ...formData, avatar: e.target.value })
                        }
                        className="col-span-4"
                        placeholder="输入头像图片的 URL 地址"
                      />
                    </div>
                  </div>
                </div>

                {/* 官职 */}
                <div className="grid grid-cols-5 lg:grid-cols-10 items-center gap-4 lg:col-span-2">
                  <Label htmlFor="official_position" className="text-right col-span-1">
                    官职
                  </Label>
                  <Input
                    id="official_position"
                    value={formData.official_position}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        official_position: e.target.value,
                      })
                    }
                    className="col-span-4 lg:col-span-9"
                  />
                </div>

                {/* 是否在世 */}
                <div className="grid grid-cols-5 items-center gap-4">
                  <Label htmlFor="is_alive" className="text-right col-span-1">
                    是否在世
                  </Label>
                  <div className="col-span-4 flex items-center space-x-2">
                    <Checkbox
                      id="is_alive"
                      checked={formData.is_alive}
                      onCheckedChange={(checked) => {
                        const alive = checked as boolean;
                        setFormData({
                          ...formData,
                          is_alive: alive,
                          death_date: alive ? "" : formData.death_date,
                          burial_place: alive ? "" : formData.burial_place,
                        });
                      }}
                    />
                    <Label htmlFor="is_alive" className="font-normal">
                      在世
                    </Label>
                  </div>
                </div>

                {/* 卒年 (仅去世可选) */}
                {!formData.is_alive && (
                  <>
                    <div className="grid grid-cols-5 items-center gap-4">
                      <Label htmlFor="death_date" className="text-right col-span-1">
                        卒年
                      </Label>
                      <Input
                        id="death_date"
                        type="date"
                        value={formData.death_date}
                        onChange={(e) =>
                          setFormData({ ...formData, death_date: e.target.value })
                        }
                        className="col-span-4"
                      />
                    </div>
                    <div className="grid grid-cols-5 lg:grid-cols-10 items-center gap-4 lg:col-span-2">
                      <Label htmlFor="burial_place" className="text-right col-span-1">
                        埋葬地点
                      </Label>
                      <Input
                        id="burial_place"
                        value={formData.burial_place}
                        onChange={(e) =>
                          setFormData({ ...formData, burial_place: e.target.value })
                        }
                        className="col-span-4 lg:col-span-9"
                        placeholder="如：某某公墓 / 祖坟地址"
                      />
                    </div>
                  </>
                )}

                {/* 简介 */}
                <div className="grid grid-cols-5 lg:grid-cols-10 items-start gap-4 lg:col-span-2">
                  <Label htmlFor="remarks" className="text-right pt-2 col-span-1">
                    简介
                  </Label>
                  <div className="col-span-4 lg:col-span-9 min-h-[180px]">
                    <RichTextEditor
                      value={formData.remarks}
                      onChange={(value) => setFormData({ ...formData, remarks: value })}
                      placeholder="请输入人物简介..."
                    />
                  </div>
                </div>

                {/* 配偶 */}
                <div className="grid grid-cols-5 lg:grid-cols-10 items-center gap-4 lg:col-span-2">
                  <Label htmlFor="spouse" className="text-right col-span-1">
                    配偶
                  </Label>
                  <Input
                    id="spouse"
                    value={formData.spouse}
                    onChange={(e) =>
                      setFormData({ ...formData, spouse: e.target.value })
                    }
                    className="col-span-4 lg:col-span-9"
                  />
                </div>
                <div className="grid grid-cols-5 items-center gap-4">
                  <Label htmlFor="spouse_id" className="text-right col-span-1">
                    配偶关联
                  </Label>
                  <Select
                    value={formData.spouse_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, spouse_id: value })
                    }
                  >
                    <SelectTrigger className="col-span-4" id="spouse_id">
                      <SelectValue placeholder="选择成员（可选）" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">不关联</SelectItem>
                      {spouseOptions.map((option) => (
                        <SelectItem key={option.id} value={String(option.id)}>
                          {option.name}
                          {option.generation ? `（第${option.generation}世）` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>


              </div>
            </div>
            
            <DialogFooter className="px-6 py-4 border-t mt-auto">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isShareDialogOpen} onOpenChange={(open) => !open && setIsShareDialogOpen(false)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>只读分享链接</DialogTitle>
            <DialogDescription>
              生成的链接仅用于查看，并对敏感字段进行脱敏展示。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="share-days">有效期（天）</Label>
              <Input
                id="share-days"
                type="number"
                min="1"
                value={shareDays}
                onChange={(e) => setShareDays(e.target.value)}
              />
            </div>
            <Button onClick={handleCreateShareLink} disabled={isCreatingShare}>
              {isCreatingShare ? "生成中..." : "生成链接"}
            </Button>
            {shareLink ? (
              <div className="space-y-2">
                <Label>分享链接</Label>
                <Input value={shareLink} readOnly />
                <div className="text-xs text-muted-foreground">
                  {shareExpiresAt ? `过期时间：${new Date(shareExpiresAt).toLocaleString("zh-CN")}` : "永久有效"}
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsShareDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 表格 */}
      <div className={cn("border rounded-lg transition-opacity duration-200 overflow-x-auto", isPending && "opacity-60 pointer-events-none")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="全选"
                />
              </TableHead>
              <TableHead className="min-w-[220px]">成员</TableHead>
              <TableHead className="min-w-[160px]">父系关系</TableHead>
              <TableHead className="min-w-[220px]">生卒信息</TableHead>
              <TableHead className="min-w-[260px]">档案摘要</TableHead>
              <TableHead className="min-w-[150px]">更新时间</TableHead>
              <TableHead className="min-w-[140px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((member) => (
                <TableRow
                  key={member.id}
                  data-state={selectedIds.has(member.id) ? "selected" : undefined}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(member.id)}
                      onCheckedChange={(checked) =>
                        handleSelectOne(member.id, checked as boolean)
                      }
                      aria-label={`选择 ${member.name}`}
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <button
                      type="button"
                      onClick={() => handleOpenEditDialog(member)}
                      className="text-primary hover:underline cursor-pointer text-left font-medium"
                    >
                      {member.name}
                    </button>
                    <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                      <div>ID: {member.id}</div>
                      <div>
                        {member.generation ? `第${member.generation}世` : "世代未知"}
                        {member.sibling_order ? ` · 行${member.sibling_order}` : ""}
                        {member.gender ? ` · ${member.gender}` : ""}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    {member.father_id && member.father_name ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={loadingFatherId === member.father_id}
                          onClick={async () => {
                            if (!member.father_id) return;
                            setLoadingFatherId(member.father_id);
                            try {
                              const fatherData = await fetchMemberById(member.father_id);
                              if (fatherData) {
                                handleOpenEditDialog(fatherData);
                              }
                            } finally {
                              setLoadingFatherId(null);
                            }
                          }}
                          className={cn(
                            "text-primary hover:underline cursor-pointer text-left",
                            loadingFatherId === member.father_id && "opacity-70 cursor-wait"
                          )}
                        >
                          {member.father_name}
                        </button>
                        {loadingFatherId === member.father_id && (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="text-sm space-y-1">
                      <div>
                        <span className="text-muted-foreground mr-1">生:</span>
                        {formatDateDisplay(member.birthday)}
                      </div>
                      <div>
                        <span className="text-muted-foreground mr-1">卒:</span>
                        {formatDateDisplay(member.death_date)}
                      </div>
                      <div className={cn("text-xs inline-flex rounded px-1.5 py-0.5", member.is_alive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>
                        {member.is_alive ? "在世" : "已故"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="text-sm space-y-1">
                      <div className="truncate max-w-[240px]">
                        <span className="text-muted-foreground mr-1">居:</span>
                        {member.residence_place ?? "-"}
                      </div>
                      <div className="truncate max-w-[240px]">
                        <span className="text-muted-foreground mr-1">职:</span>
                        {member.official_position ?? "-"}
                      </div>
                      <div className="truncate max-w-[240px]">
                        <span className="text-muted-foreground mr-1">配:</span>
                        {member.spouse ?? "-"}
                      </div>
                      <div className="truncate max-w-[240px]">
                        <span className="text-muted-foreground mr-1">联:</span>
                        {member.contact ?? "-"}
                      </div>
                      <div className="truncate max-w-[240px]">
                        <span className="text-muted-foreground mr-1">简:</span>
                        {getPlainText(member.remarks)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground align-top">
                    {new Date(member.updated_at).toLocaleString("zh-CN")}
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                      asChild
                    >
                      <a href={`/family-tree/albums?memberId=${member.id}`} target="_blank" rel="noopener noreferrer">
                        相册
                      </a>
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                      asChild
                    >
                      <a href={`/family-tree/life-events?memberId=${member.id}`} target="_blank" rel="noopener noreferrer">
                        生平
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
        <p className="text-sm text-muted-foreground">
          共 {totalCount} 条记录，第 {currentPage} / {totalPages || 1} 页
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isPending}
          >
            <ChevronLeft className="h-4 w-4" />
            上一页
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isPending}
          >
            下一页
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>


    </div>
  );
}
