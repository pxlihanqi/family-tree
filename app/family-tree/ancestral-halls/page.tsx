import { AncestralHallsClient } from "./ancestral-halls-client";

export default function AncestralHallsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold">祠堂与捐赠记录</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        支持维护多个祠堂，录入祠堂名称、照片、历史简介，以及对应的捐赠姓名、金额和备注。
      </p>
      <div className="mt-6">
        <AncestralHallsClient />
      </div>
    </div>
  );
}
