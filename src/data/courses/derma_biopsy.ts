import type { CourseConfig } from '@/types';
import { fmtTime } from '@/utils/format';

export const dermaBiopsy: CourseConfig = {
  id: 'derma_biopsy',
  name: '皮肤活检术',
  shortName: '皮肤活检',
  videoSrc: '/videos/derma_biopsy.mp4',

  rubric: [
    { key: 'consent', label: '知情同意与沟通', maxScore: 10 },
    { key: 'prepSterile', label: '消毒麻醉准备', maxScore: 15 },
    { key: 'sampling', label: '取材操作技术', maxScore: 30 },
    { key: 'specimenHandle', label: '标本处理与固定', maxScore: 20 },
    { key: 'woundClosure', label: '创口处理与缝合', maxScore: 15 },
    { key: 'documentation', label: '术后沟通与记录', maxScore: 10 },
  ],

  evals: {
    1: { scores: [9, 14, 27, 18, 13, 9], timestamps: [8, 35, 90, 180, 260, 350] },
    2: { scores: [8, 13, 25, 17, 12, 8], timestamps: [10, 38, 95, 185, 265, 355] },
    3: { scores: [7, 11, 22, 15, 11, 7], timestamps: [12, 40, 100, 190, 270, 360] },
    4: { scores: [10, 14, 28, 19, 14, 9], timestamps: [6, 30, 85, 175, 255, 345] },
    5: { scores: [7, 11, 20, 14, 10, 7], timestamps: [15, 45, 110, 200, 280, 370] },
    6: { scores: [8, 13, 25, 17, 13, 8], timestamps: [9, 36, 92, 182, 262, 352] },
    7: { scores: [8, 13, 24, 17, 12, 8], timestamps: [11, 39, 97, 187, 267, 357] },
    8: { scores: [8, 14, 26, 18, 13, 9], timestamps: [16, 48, 115, 205, 285, 375] },
  },

  evidenceText: {
    0: {
      excellent: '主动核对患者信息，清晰说明活检目的、操作过程及主要风险（出血、感染、疤痕），耐心回答患者疑问后签署同意书，全程体现人文关怀。',
      pass: '能完成知情告知和同意书签署，但风险说明不够全面或表达略显生硬，未充分回应患者顾虑。',
      fail: '跳过或简化知情同意流程，未充分说明风险，直接进行操作。',
    },
    1: {
      excellent: '消毒范围充分（皮损外5cm），碘伏消毒顺序正确（由中心向外）。利多卡因局麻时回抽无血才推药，局麻点分布均匀，待麻醉起效后用针尖轻触确认无痛感再开始操作。',
      pass: '消毒和麻醉步骤基本完成，但消毒范围偏小或回抽步骤简略，麻醉验证方式不够规范。',
      fail: '消毒操作不规范或遗漏，麻醉注射未回抽，缺少麻醉效果确认步骤。',
    },
    2: {
      excellent: '环钻选择直径合适（≥4mm），旋转切入深度足够（达皮下脂肪层），镊子仅持标本边缘避免挤压。标本完整包含表皮+真皮全层，取材时间控制在3分钟内。',
      pass: '取材基本完成，但深度或大小稍有不足，标本镊夹时有轻微挤压，操作时间偏长。',
      fail: '取材深度不足（仅达表皮层）或标本被严重挤压变形，影响病理诊断。',
    },
    3: {
      excellent: '取材后立即（<30秒）放入预先准备好的10%甲醛固定液中，标本未失水或风干。容器标签信息完整（姓名/ID/取材部位/日期），固定液量充足（标本体积的5~10倍）。',
      pass: '标本放入固定液，但操作有延迟或标签信息不够完整，固定液量基本足够。',
      fail: '标本处理延迟过长导致失水/变形，或容器标注信息缺失，无法正确关联病理结果。',
    },
    4: {
      excellent: '止血彻底（压迫止血3~5分钟或双极电凝），创口边缘对合整齐，缝合针距均匀（3~5mm），打结牢固不过紧，敷料覆盖无渗血。',
      pass: '创口基本关闭，止血尚可，但缝合针距略不均匀或创口对合稍有偏差，敷料包扎基本规范。',
      fail: '止血不彻底导致活动性渗血，或缝合创口对合不良，敷料包扎不足。',
    },
    5: {
      excellent: '详细告知换药频次（2~3天/次）、拆线时间（面部5~7天，躯干7~10天，四肢10~14天），说明结果等待周期（通常5~7工作日），交代异常症状（红肿化脓）的处理方式。',
      pass: '告知了主要注意事项，但拆线时间或结果等待周期说明不够精确，缺少异常情况的应对指引。',
      fail: '术后沟通简略，未提供换药拆线指导，患者不清楚后续流程。',
    },
  },

  getLevel: (score: number, maxScore: number) => {
    const pct = score / maxScore;
    return pct >= 0.85 ? 'excellent' : pct >= 0.6 ? 'pass' : 'fail';
  },

  aiSuggestionGen: (studentName, total, weakDims, evalData) => {
    const grade = total >= 90 ? '优秀' : total >= 80 ? '良好' : total >= 70 ? '合格' : '需加强';
    let text = `本次皮肤活检术操作表现${grade}，${studentName}同学总分${total}/100分。`;

    if (weakDims.length > 0) {
      const w = weakDims[0];
      const ts = evalData?.timestamps[w.idx];
      text += `\n\n在「${w.label}」方面存在提升空间（${w.score}/${w.maxScore}分），`;
      if (ts) text += `视频 ${fmtTime(ts)} 处可观察到操作细节需改进。`;
      text += `建议重点关注手术无菌操作规范和取材深度控制。`;
    }

    text += `\n\n建议后续训练重点：`;
    text += `①在模型上反复练习环钻取材手法，确保深度达标；`;
    text += `②请带教老师示范标准缝合技术并进行逐步指导；`;
    text += `③加强术前知情同意的完整性训练，体现人文关怀。`;

    return text;
  },
};
