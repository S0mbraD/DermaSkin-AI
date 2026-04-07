import type { CourseConfig } from '@/types';
import { fmtTime } from '@/utils/format';

export const dermaPatch: CourseConfig = {
  id: 'derma_patch',
  name: '斑贴试验',
  shortName: '斑贴试验',
  videoSrc: '/videos/derma_patch.mp4',

  rubric: [
    { key: 'preparation', label: '物品准备与知情告知', maxScore: 10 },
    { key: 'siteSelection', label: '背部贴敷部位选择', maxScore: 20 },
    { key: 'application', label: '贴敷操作规范', maxScore: 25 },
    { key: 'reading', label: '结果判读（48h/96h）', maxScore: 30 },
    { key: 'guidance', label: '患者宣教与随访指导', maxScore: 15 },
  ],

  evals: {
    1: { scores: [9, 17, 21, 26, 13], timestamps: [5, 30, 80, 150, 230] },
    2: { scores: [8, 15, 19, 23, 12], timestamps: [8, 33, 85, 155, 235] },
    3: { scores: [6, 13, 16, 20, 10], timestamps: [10, 36, 90, 160, 240] },
    4: { scores: [10, 18, 23, 28, 14], timestamps: [4, 28, 75, 145, 225] },
    5: { scores: [5, 11, 14, 17, 8], timestamps: [12, 40, 95, 168, 248] },
    6: { scores: [8, 16, 20, 24, 12], timestamps: [7, 32, 82, 152, 232] },
    7: { scores: [7, 14, 17, 21, 11], timestamps: [9, 34, 87, 157, 237] },
    8: { scores: [5, 10, 13, 16, 7], timestamps: [14, 42, 98, 172, 252] },
  },

  evidenceText: {
    0: {
      excellent: '完整检查贴敷板和变应原系列，详细告知患者48小时内保持背部干燥、避免剧烈运动的原因和注意事项。',
      pass: '物品准备基本完成，能告知主要注意事项，但部分禁忌说明略有遗漏。',
      fail: '物品准备不完整或遗漏重要禁忌说明，患者不了解注意事项。',
    },
    1: {
      excellent: '准确定位脊柱旁3cm，选择上中背部皮肤无皮损、无毛发的平整区域，各贴敷板间距≥3cm，标记清晰。',
      pass: '部位选择基本正确，但间距略不够或标记不够清晰。',
      fail: '选择有皮损或毛发密集的区域，间距不足导致可能出现交叉反应。',
    },
    2: {
      excellent: '按规定顺序正确加载变应原，贴敷板压贴均匀、无气泡，绘制完整的变应原位置记录图。',
      pass: '贴敷操作基本完成，但存在少量气泡或顺序略有错乱。',
      fail: '贴敷不牢固或遗漏变应原，未绘制记录图。',
    },
    3: {
      excellent: '准确使用ICDRG标准进行分级（-/±/+/++/+++），能正确区分刺激性反应与变态反应的特征差异，记录完整规范。',
      pass: '判读基本正确，能识别主要阳性反应，但对刺激性反应和变态反应的区分不够准确。',
      fail: '评级标准使用错误或混淆刺激性反应与变态反应。',
    },
    4: {
      excellent: '清晰说明阳性变应原的临床意义，给出具体的日常生活回避建议和替代方案，安排合理随访计划。',
      pass: '基本宣教完成，告知了主要阳性结果，但回避建议不够具体。',
      fail: '未说明阳性结果的临床意义，缺少回避措施指导。',
    },
  },

  getLevel: (score: number, maxScore: number) => {
    const pct = score / maxScore;
    return pct >= 0.85 ? 'excellent' : pct >= 0.6 ? 'pass' : 'fail';
  },

  aiSuggestionGen: (studentName, total, weakDims, evalData) => {
    const grade = total >= 90 ? '优秀' : total >= 80 ? '良好' : total >= 70 ? '合格' : '需加强';
    let text = `本次斑贴试验操作表现${grade}，${studentName}同学总分${total}/100分。`;

    if (weakDims.length > 0) {
      const w = weakDims[0];
      const ts = evalData?.timestamps[w.idx];
      text += `\n\n在「${w.label}」方面存在提升空间（${w.score}/${w.maxScore}分），`;
      if (ts) text += `视频 ${fmtTime(ts)} 处可观察到操作细节需改进。`;
      text += `建议加强ICDRG判读标准的系统学习和实践。`;
    }

    text += `\n\n建议后续训练重点：`;
    text += `①系统复习ICDRG标准和常见变应原系列知识；`;
    text += `②在标准化患者或同学间进行贴敷操作练习；`;
    text += `③收集典型斑贴试验反应图片，提升结果判读能力。`;

    return text;
  },
};
