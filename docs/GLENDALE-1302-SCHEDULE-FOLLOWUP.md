# Glendale #1302 設備清單複核

依原始 K1.0–K1.4 圖面接續 [初次匯入](./GLENDALE-1302-EQUIPMENT-REVIEW.json)。線上資料比對確認店號及標題都是 #1302。

## 已完成並線上讀回

- K1.1 的 No. 36 已拆為同圖號的兩列。Island Glass Case 為 52.5 W × 49.5 D × 58 H in，Bakery Display Shelf 為 72 W × 39 D × 44.8 H in。各列暫列 1 件，待核實實裝數量。整店共 140 列、292 件（含暫列）。
- 已加入 #130 Bakery and Deli Sales and Queuing、#132 Scullery，並依可辨識圖面標籤更新設備指派及既有區域名稱。#100 Sales Floor、#103 Checkstands、#131 Hot Deli、#133 Bakery、#121 Washiland Boba、#122 Panlao Dad Chicken 已加上房號。跨多房的彙總區域仍需逐台核對。
- K1.1 補入 No. 37、45、64 的圖面尺寸。下表共 9 列已寫入門店自訂列的尺寸或規格與來源。來源可從自訂設備預覽開啟。原始初次匯入紀錄保留當時快照。

| 圖號 | 型號 | 尺寸 | 來源 |
| --- | --- | --- | --- |
| 48 | G10010 | 29.87" W x 35" D x 83.44" H | [規格來源](https://www.energystar.gov/productfinder/product/certified-commercial-refrigerators-and-freezers/details/3477664/export/pdf/download) |
| 74 | UCR34HC | 34" W x 24-5/8" D x 31-1/8" H | [規格來源](https://beverage-air.com/UCR34HC-34-Undercounter-Two-Door-RefrigeratorShallow-Depth) |
| 90（K1.1、K1.2） | HS-1615KS | 15-1/4" W x 15-3/4" D x 19-3/4" H | [GSW 規格 PDF](https://gsw-usa.com/attachment?id_attachment=115) |
| 107 | HS-1220 | 12" W x 18" D | [規格來源](https://krowne.com/hs-1220) |
| 164 | THA-803SA | 18-1/8" W x 15" D x 15-3/8" H | [規格來源](https://www.zojirushi.com/app/product/tha) |
| 190 | G9-2T DBC SST | 沿用圖面尺寸 | [規格來源](https://commercial.bunn.com/33700.0000) |
| 301 | TCDD-36H-B-N | 36.5" W x 30" D x 50" H | [規格來源](https://www.turboairinc.com/products/tcdd-36h-wb-n/) |
| 302 | WFST-1X | 32-1/8" W x 25-1/4" D x 32-3/4" H | [規格來源](https://www.hatcocorp.com/cms/IOMANUALS/000000005048001-00000-20100216.PDF) |

## 接續工作

- 本輪優先複核 58 列。50 列已補來源連結與適用註記，並逐列線上讀回。來源包含原廠產品頁、規格 PDF 及型號認證資料。系列或相近後綴只列參考，備註標示仍需核實的配置。4 列圖面列為 CUSTOM，保留原資料。廠商和型號皆空白的列也維持原狀。[逐列核對紀錄](./GLENDALE-1302-SPEC-SOURCE-REVIEW.json)
- 4 列待核實。No. 199 Toshiba 6800 與 No. 149 Atlanta Culinary ARE-2 待查銘牌或送審資料。No. 195 Xytronic LF-90 待確認封口機廠商及型號。No. 307 BOTINKIT MAX 5.0 待取得該版本規格書。
- 同一圖號有不同尺寸時，在同一門店建立獨立變體列，保留圖號，填各自型號、尺寸、數量和 Room。優先核對 K1.0 No. 60（AHT Paris 185／210，合計 5）及 No. 114（GSW EL-2DR／EL-5DR，合計 2）、K1.1 No. 120（Eagle T3060SB／T3072SB，合計 7）、No. 157（圖面列 HFW-3／4／5，合計 2），以及 K1.4 Panlao No. 6（GSW WT-EE3030／WT-EE2430，合計 4）及 No. 7（Winco VCS-1836／VCS-1848，合計 4）。原圖列為選項或未標分配數時，先保留合計並核實實際組合，避免把總數分配給錯誤尺寸。
- 回查 K1.0 和 K1.2 的 Seafood、Meat、Produce、Back of House 和 Staff Lockers，按設備所在位置對應實際房號，再把房號加到 Room 名稱前。原彙總區域包含多個房間。
- 介面需求已實作。第一欄是圖紙號碼，門店清單可切換原有順序或按圖號自然排序，標題上方 Stores 旁可收合或展開設備搜尋欄。排序切換只改顯示順序。
