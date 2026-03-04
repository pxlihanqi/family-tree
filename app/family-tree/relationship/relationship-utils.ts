import type { FamilyMemberNode } from "../graph/actions";

export type RelationshipType =
  | "self"
  | "ancestor"
  | "descendant"
  | "sibling"
  | "cousin"
  | "spouse"
  | "other"
  | "none";

type Direction = "up" | "down" | "spouse";

function getWufuLabel(bloodSteps: number) {
  if (bloodSteps <= 0) return "";
  if (bloodSteps === 1) return "一服";
  if (bloodSteps === 2) return "二服";
  if (bloodSteps === 3) return "三服";
  if (bloodSteps === 4) return "四服";
  if (bloodSteps === 5) return "五服";
  return "出五服";
}

function getGenerationBand(upSteps: number, downSteps: number) {
  const delta = upSteps - downSteps;
  if (delta >= 2) return "祖辈";
  if (delta === 1) return "父辈";
  if (delta === 0) return "平辈";
  if (delta === -1) return "子辈";
  if (delta <= -2) return "孙辈";
  return "同宗";
}

function getAncestorTitle(gender: FamilyMemberNode["gender"], steps: number, isMaternal: boolean = false) {
  if (steps === 1) return gender === "女" ? "母亲" : "父亲";
  if (steps === 2) return isMaternal ? (gender === "女" ? "外祖母" : "外祖父") : (gender === "女" ? "祖母" : "祖父");
  if (steps === 3) return isMaternal ? (gender === "女" ? "外曾祖母" : "外曾祖父") : (gender === "女" ? "曾祖母" : "曾祖父");
  if (steps === 4) return isMaternal ? (gender === "女" ? "外高祖母" : "外高祖父") : (gender === "女" ? "高祖母" : "高祖父");
  return isMaternal ? (gender === "女" ? `外太${'高'.repeat(steps - 4)}祖母` : `外太${'高'.repeat(steps - 4)}祖父`) : (gender === "女" ? `太${'高'.repeat(steps - 4)}祖母` : `太${'高'.repeat(steps - 4)}祖父`);
}

function getDescendantTitle(gender: FamilyMemberNode["gender"], steps: number) {
  if (steps === 1) return gender === "女" ? "女儿" : "儿子";
  if (steps === 2) return gender === "女" ? "孙女" : "孙子";
  if (steps === 3) return gender === "女" ? "曾孙女" : "曾孙";
  if (steps === 4) return gender === "女" ? "玄孙女" : "玄孙";
  return gender === "女" ? "晚辈女性后代" : "晚辈男性后代";
}

function buildLabel(main: string, band: string, wufu: string) {
  const tags = [band, wufu].filter(Boolean).join("·");
  return tags ? `${main}（${tags}）` : main;
}

function getSiblingTitle(self: FamilyMemberNode, target: FamilyMemberNode) {
  const selfOrder = self.sibling_order;
  const targetOrder = target.sibling_order;
  const hasRank = selfOrder !== null && targetOrder !== null && selfOrder !== targetOrder;
  const isElder = hasRank ? targetOrder < selfOrder : null;

  if (target.gender === "男") {
    if (isElder === true) return "哥哥";
    if (isElder === false) return "弟弟";
    return "兄弟";
  }

  if (target.gender === "女") {
    if (isElder === true) return "姐姐";
    if (isElder === false) return "妹妹";
    return "姐妹";
  }

  return "兄弟姐妹";
}

function compareAgeOrder(self: FamilyMemberNode, target: FamilyMemberNode) {
  if (self.birthday && target.birthday) {
    const selfTs = new Date(self.birthday).getTime();
    const targetTs = new Date(target.birthday).getTime();
    if (!Number.isNaN(selfTs) && !Number.isNaN(targetTs) && selfTs !== targetTs) {
      return targetTs < selfTs ? "elder" : "younger";
    }
  }
  return null;
}

function getCousinTitle(self: FamilyMemberNode, target: FamilyMemberNode, prefix: "堂" | "表") {
  const byBirthday = compareAgeOrder(self, target);
  const isElder = byBirthday === "elder" ? true : byBirthday === "younger" ? false : null;

  if (target.gender === "男") {
    if (isElder === true) return `${prefix}兄`;
    if (isElder === false) return `${prefix}弟`;
    return `${prefix}兄弟`;
  }

  if (target.gender === "女") {
    if (isElder === true) return `${prefix}姐`;
    if (isElder === false) return `${prefix}妹`;
    return `${prefix}姐妹`;
  }

  return `${prefix}兄弟姐妹`;
}

function getPaternalUncleTitle(parent: FamilyMemberNode | null, target: FamilyMemberNode) {
  if (target.gender !== "男") return "姑姑";
  if (!parent) return "伯叔";

  // 优先用排行判断长幼；排行越小通常越年长
  if (
    parent.sibling_order !== null &&
    target.sibling_order !== null &&
    parent.sibling_order !== target.sibling_order
  ) {
    return target.sibling_order < parent.sibling_order ? "伯父" : "叔叔";
  }

  // 回退用生日判断
  const byBirthday = compareAgeOrder(parent, target);
  if (byBirthday === "elder") return "伯父";
  if (byBirthday === "younger") return "叔叔";

  return "伯叔";
}

function inferBloodRelation(
  path: FamilyMemberNode[],
  directions: Direction[],
  fullDirections: Direction[] = directions
) {
  const upSteps = directions.filter((d) => d === "up").length;
  const downSteps = directions.filter((d) => d === "down").length;
  const bloodSteps = upSteps + downSteps;
  const target = path[path.length - 1];
  const band = getGenerationBand(upSteps, downSteps);
  const wufu = getWufuLabel(bloodSteps);

  // 母系判定：在“上行到共同祖先”阶段经过配偶边，通常是从父系切到母系
  const firstDownIdx = fullDirections.indexOf("down");
  const upPhase = (firstDownIdx === -1 ? fullDirections : fullDirections.slice(0, firstDownIdx));
  const isMaternal = upPhase.includes("spouse");

  if (downSteps === 0) {
    const ancestorTitle = getAncestorTitle(target.gender, upSteps, isMaternal);
    return {
      type: "ancestor" as const,
      label: buildLabel(ancestorTitle, band, wufu),
      core: upSteps === 1 ? ancestorTitle : (isMaternal ? "母系长辈" : "父系长辈"),
    };
  }

  if (upSteps === 0) {
    // 检查是否是通过女儿连接的（外孙/外孙女）
    let isGrandchild = true;
    
    // 分析路径，检查第二代节点（子女）的性别
    if (downSteps >= 2 && path.length > 1) {
      const childNode = path[1]; // 子女节点
      if (childNode.gender === "女") {
        // 女儿的子女是外孙/外孙女
        isGrandchild = false;
      }
    }
    
    // 根据是否是外孙/外孙女生成称呼
    let descendantTitle = getDescendantTitle(target.gender, downSteps);
    
    if (!isGrandchild && downSteps >= 2) {
      // 外孙/外孙女
      if (downSteps === 2) {
        descendantTitle = target.gender === "女" ? "外孙女" : "外孙";
      } else if (downSteps === 3) {
        descendantTitle = target.gender === "女" ? "外曾孙女" : "外曾孙";
      } else if (downSteps === 4) {
        descendantTitle = target.gender === "女" ? "外玄孙女" : "外玄孙";
      } else {
        descendantTitle = target.gender === "女" ? `外${'玄'.repeat(downSteps - 4)}孙女` : `外${'玄'.repeat(downSteps - 4)}孙`;
      }
    }
    
    return {
      type: "descendant" as const,
      label: buildLabel(descendantTitle, band, wufu),
      core: downSteps === 1 ? "儿女" : isGrandchild ? "孙辈" : "外孙辈",
    };
  }

  if (upSteps === 1 && downSteps === 1) {
    const self = path[0];
    const siblingTitle = getSiblingTitle(self, target);
    return {
      type: "sibling" as const,
      label: buildLabel(siblingTitle, band, wufu),
      core: siblingTitle,
    };
  }

  if (upSteps === 2 && downSteps === 1) {
    const parentNode = path.length > 1 ? path[1] : null;
    const title = isMaternal
      ? target.gender === "女"
        ? "姨妈"
        : "舅舅"
      : target.gender === "女"
        ? "姑姑"
        : getPaternalUncleTitle(parentNode, target);
    return {
      type: "other" as const,
      label: buildLabel(title, band, wufu),
      core: title,
    };
  }

  if (upSteps === 1 && downSteps === 2) {
    const sibling = path[2];
    const title =
      sibling?.gender === "女"
        ? target.gender === "女"
          ? "外甥女"
          : "外甥"
        : target.gender === "女"
          ? "侄女"
          : "侄子";
    return {
      type: "other" as const,
      label: buildLabel(title, band, wufu),
      core: title,
    };
  }

  if (upSteps === downSteps && upSteps >= 2) {
    // 堂表区分（不依赖姓名首字）：
    // 1) 上行阶段若经过配偶边，视为母系 -> 表
    // 2) 从共同祖先下行第一支若为女性（姑表/姨表）-> 表
    // 3) 其余父系男性旁支 -> 堂
    const firstDownIdx = fullDirections.indexOf("down");
    const branchNode =
      firstDownIdx >= 0 && firstDownIdx + 1 < path.length
        ? path[firstDownIdx + 1]
        : null;
    const prefix =
      isMaternal || branchNode?.gender === "女" ? "表" : "堂";
    const self = path[0];
    const cousinTitle = getCousinTitle(self, target, prefix);
    return {
      type: "cousin" as const,
      label: buildLabel(cousinTitle, band, wufu),
      core: `${prefix}亲`,
    };
  }

  if (upSteps > downSteps) {
    return {
      type: "other" as const,
      label: buildLabel(`旁系长辈（上${upSteps}下${downSteps}）`, band, wufu),
      core: "旁系长辈",
    };
  }

  return {
    type: "other" as const,
    label: buildLabel(`旁系晚辈（上${upSteps}下${downSteps}）`, band, wufu),
    core: "旁系晚辈",
  };
}

function spouseTitleByCore(core: string, targetGender: FamilyMemberNode["gender"]) {
  if (core.includes("父亲")) return "母亲";
  if (core.includes("母亲")) return "父亲";
  if (core.includes("姑姑")) return "姑父";
  if (core.includes("舅舅")) return "舅母";
  if (core.includes("姨妈")) return "姨父";
  if (core.includes("伯父")) return "伯母";
  if (core.includes("叔叔")) return "婶婶";
  if (core.includes("伯叔")) return targetGender === "女" ? "婶婶" : "伯叔母";
  if (core.includes("哥哥")) return "嫂子";
  if (core.includes("弟弟")) return "弟媳";
  if (core.includes("姐姐")) return "姐夫";
  if (core.includes("妹妹")) return "妹夫";
  if (core === "兄弟") return "兄弟的配偶";
  if (core === "姐妹") return "姐妹的配偶";
  if (core.includes("兄弟姐妹")) return "兄弟姐妹的配偶";
  if (core.includes("侄")) return targetGender === "女" ? "侄女婿" : "侄媳";
  if (core.includes("外甥")) return targetGender === "女" ? "外甥女婿" : "外甥媳";
  if (core.includes("堂亲")) return "堂亲配偶";
  if (core.includes("表亲")) return "表亲配偶";
  return `${core}的配偶`;
}

export function describeRelationship(path: FamilyMemberNode[] | null): {
  type: RelationshipType;
  label: string;
} {
  if (!path || path.length === 0) {
    return { type: "none", label: "暂无亲缘路径" };
  }
  if (path.length === 1) {
    return { type: "self", label: "本人" };
  }

  const directions: Direction[] = [];
  for (let i = 0; i < path.length - 1; i += 1) {
    const current = path[i];
    const next = path[i + 1];
    if (next.id === current.father_id) {
      directions.push("up");
    } else if (next.father_id === current.id) {
      directions.push("down");
    } else if (current.spouse_id === next.id || next.spouse_id === current.id) {
      directions.push("spouse");
    } else {
      return { type: "other", label: "旁系亲属" };
    }
  }

  const spouseSteps = directions.filter((d) => d === "spouse").length;
  const bloodDirections = directions.filter((d) => d !== "spouse");

  if (spouseSteps > 0 && bloodDirections.length === 0) {
    if (spouseSteps === 1) {
      return { type: "spouse", label: "配偶" };
    }
    return { type: "other", label: "姻亲链" };
  }

  if (spouseSteps === 0) {
    return inferBloodRelation(path, directions, directions);
  }

  // 含配偶边：先算血亲主关系，再做姻亲修饰
  const bloodNodes: FamilyMemberNode[] = [path[0]];
  for (let i = 0; i < directions.length; i += 1) {
    if (directions[i] !== "spouse") {
      bloodNodes.push(path[i + 1]);
    }
  }

  const blood = inferBloodRelation(bloodNodes, bloodDirections, directions);

  // 血亲后接配偶，优先输出传统叫法
  const isSpouseAtEnd = directions[directions.length - 1] === "spouse";
  if (spouseSteps === 1 && isSpouseAtEnd) {
    return {
      type: "other",
      label: `${spouseTitleByCore(blood.core, path[path.length - 1].gender)}（姻亲）`,
    };
  }

  if (directions[0] === "spouse") {
    // 检查是否是配偶的父母
    if (blood.core === "父母" && bloodNodes.length === 2) {
      const target = path[path.length - 1];
      // 根据目标的性别来确定称呼
      if (target.gender === "女") {
        return { type: "other", label: `岳母（姻亲）` };
      } else {
        return { type: "other", label: `岳父（姻亲）` };
      }
    }
    // 配偶的子女 -> 儿子 / 女儿
    if (blood.core === "儿女" && bloodNodes.length === 2) {
      const target = path[path.length - 1];
      if (target.gender === "女") {
        return { type: "other", label: "女儿（姻亲）" };
      }
      if (target.gender === "男") {
        return { type: "other", label: "儿子（姻亲）" };
      }
      return { type: "other", label: "子女（姻亲）" };
    }
    return { type: "other", label: `配偶的${blood.label}` };
  }

  return { type: "other", label: `${blood.label}（姻亲）` };
}
