import type { CourseConfig } from '@/types';
import { fmtTime } from '@/utils/format';

export const dermaGonococcal: CourseConfig = {
  id: 'derma_gonococcal',
  name: '皮肤科淋球菌检查操作',
  shortName: '淋球菌检查',
  videoSrc: '/videos/derma_gonococcal.mp4',

  rubric: [
    { key: 'communication', label: '沟通与准备', maxScore: 15 },
    { key: 'specimen', label: '标本采集', maxScore: 25 },
    { key: 'procedure', label: '操作程序', maxScore: 37 },
    { key: 'results', label: '结果及意义', maxScore: 18 },
    { key: 'aseptic', label: '无菌观念', maxScore: 5 },
  ],

  evals: {
    1: { scores: [13, 20, 37, 18, 5], timestamps: [12, 60, 120, 200, 280] },
    2: { scores: [15, 25, 35, 18, 5], timestamps: [8, 50, 110, 190, 270] },
    3: { scores: [12, 21, 31, 15, 4], timestamps: [14, 58, 125, 205, 285] },
    4: { scores: [14, 24, 35, 18, 5], timestamps: [10, 55, 115, 195, 275] },
    5: { scores: [14, 20, 32, 14, 4], timestamps: [15, 65, 130, 210, 290] },
    6: { scores: [13, 22, 30, 15, 4], timestamps: [11, 52, 118, 198, 278] },
    7: { scores: [12, 20, 29, 14, 4], timestamps: [16, 62, 128, 208, 288] },
    8: { scores: [11, 19, 28, 13, 4], timestamps: [18, 66, 135, 215, 295] },
  },

  evidenceText: {
    0: {
      excellent: '主动介绍身份并核实患者信息，详细说明淋球菌检查的目的、步骤及注意事项，充分告知可能的不适感，取得患者知情同意，沟通顺畅、态度亲切。',
      pass: '能介绍自己并说明检查流程，但对检查目的或注意事项解释不够详尽，患者沟通基本完整但缺乏细节。',
      fail: '未充分介绍自己或检查目的，患者信息核对不完整，未告知患者可能的不适感，沟通环节明显不足。',
    },
    1: {
      excellent: '正确选择取材部位（男性尿道口/女性宫颈口），无菌棉拭子操作规范，取材深度和旋转手法恰当，标本量充足且保存得当，全程动作轻柔并关注患者感受。',
      pass: '能选择合理取材部位并完成采集，但操作手法稍显生硬，取材量略有不足或旋转次数不够，标本保存基本规范。',
      fail: '取材部位选择不当或操作明显不规范，取材量严重不足或标本污染，影响后续检验结果的准确性。',
    },
    2: {
      excellent: '涂片均匀薄厚适当，革兰染色步骤完整（结晶紫→碘液→脱色→复染），各步骤时间控制精确，镜下观察顺序正确（低倍→油镜），能准确识别革兰阴性双球菌的典型形态（肾形、成对排列、胞内寄生）。',
      pass: '涂片和染色步骤基本正确，但某一环节时间控制不够精确或涂片厚度不均匀，镜下能识别淋球菌但形态描述不够详细。',
      fail: '涂片或染色操作不规范，步骤遗漏或顺序错误，镜下无法有效识别淋球菌特征，操作程序存在明显缺陷。',
    },
    3: {
      excellent: '准确解释涂片阳性（革兰阴性双球菌胞内寄生为淋球菌感染依据）和阴性结果的临床意义，强调需结合培养和核酸检测综合诊断，能阐述淋球菌感染的临床表现和治疗原则。',
      pass: '能基本解释阳性和阴性结果的意义，但对综合诊断方法的说明不够全面，临床意义阐述略显简略。',
      fail: '对检查结果的临床意义解释不清或有误，未提及需结合其他检测手段进行综合判断，缺乏对临床治疗的关联说明。',
    },
    4: {
      excellent: '全程严格执行无菌操作，手卫生规范（检查前后均洗手/消毒），正确使用和处置一次性耗材，标本容器标记清晰，锐器和感染性废物分类处置正确。',
      pass: '无菌操作基本规范，但个别环节存在疏漏（如手卫生时机不完全或废物分类不够严格），整体感控意识尚可。',
      fail: '无菌操作明显不规范，手卫生步骤缺失或耗材处置不当，感染控制意识薄弱，存在交叉感染风险。',
    },
  },

  getLevel: (score: number, maxScore: number) => {
    const pct = score / maxScore;
    return pct >= 0.85 ? 'excellent' : pct >= 0.6 ? 'pass' : 'fail';
  },

  aiSuggestionGen: (studentName, total, weakDims, evalData) => {
    const grade = total >= 90 ? '优秀' : total >= 80 ? '良好' : total >= 70 ? '合格' : '需加强';
    let text = `本次淋球菌检查操作表现${grade}，${studentName}同学总分${total}/100分。`;

    if (weakDims.length > 0) {
      const w = weakDims[0];
      const ts = evalData?.timestamps[w.idx];
      text += `\n\n在「${w.label}」方面存在提升空间（${w.score}/${w.maxScore}分），`;
      if (ts) text += `视频 ${fmtTime(ts)} 处可观察到操作细节需改进。`;
      text += `建议加强该环节的标准化训练，注意操作要点的规范执行。`;
    }

    text += `\n\n建议后续训练重点：`;
    text += `①熟练掌握标本采集的无菌操作要求，确保取材规范；`;
    text += `②反复练习革兰染色流程，严格控制各步骤时间；`;
    text += `③加强镜下淋球菌形态辨识训练，提高判读准确率。`;

    return text;
  },
};
