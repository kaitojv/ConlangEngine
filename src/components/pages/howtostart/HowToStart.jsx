import React from 'react';
import './howtostart.css';
import { ChevronRight, Lightbulb, GraduationCap, Globe } from 'lucide-react';
import StressWave from '../../UI/StressWave/StressWave.jsx';
import { useTranslation } from '@/hooks/useTranslation.jsx';

export default function HowToStart() {
    const { t } = useTranslation();

    return (
        <div className="how-to-start-container animate-fade-in">
            <header className="how-to-start-header">
                <div className="header-icon-wrapper">
                    <GraduationCap size={32} className="header-icon" />
                </div>
                <h2>{t('howToStart.title')}</h2>
                <p className="subtitle">{t('howToStart.subtitle')}</p>
            </header>
            
            <div className="how-to-start-content">
                <div className="guide-intro">
                    <p>
                        {t('howToStart.intro.sequenceDesc')}
                    </p>
                    <div className="sequence">
                        <span>{t('howToStart.intro.sequence.sound')}</span> <ChevronRight size={14}/> 
                        <span>{t('howToStart.intro.sequence.wordFormation')}</span> <ChevronRight size={14}/> 
                        <span>{t('howToStart.intro.sequence.sentenceOrganization')}</span> <ChevronRight size={14}/> 
                        <span>{t('howToStart.intro.sequence.verbSystem')}</span> <ChevronRight size={14}/> 
                        <span>{t('howToStart.intro.sequence.nounSystem')}</span> <ChevronRight size={14}/> 
                        <span>{t('howToStart.intro.sequence.spaceAndCulture')}</span> <ChevronRight size={14}/> 
                        <span>{t('howToStart.intro.sequence.writing')}</span> <ChevronRight size={14}/> 
                        <span>{t('howToStart.intro.sequence.history')}</span>
                    </div>
                    <p>
                        {t('howToStart.intro.glossDesc')}
                    </p>
                </div>

                <div className="guide-sections">
                    <section className="guide-section concept-section">
                        <h3>{t('howToStart.sec0.title')}</h3>
                        <p className="section-desc">{t('howToStart.sec0.desc')}</p>
                        <div className="concept-list">
                            <div className="concept-item">
                                <strong>{t('howToStart.sec0.morpheme.term')}</strong> {t('howToStart.sec0.morpheme.def')}
                            </div>
                            <div className="concept-item">
                                <strong>{t('howToStart.sec0.rootAffix.term')}</strong> {t('howToStart.sec0.rootAffix.def')}
                            </div>
                            <div className="concept-item">
                                <strong>{t('howToStart.sec0.subjectObject.term')}</strong> {t('howToStart.sec0.subjectObject.def')}
                            </div>
                            <div className="concept-item">
                                <strong>{t('howToStart.sec0.transitive.term')}</strong> {t('howToStart.sec0.transitive.def')}
                            </div>
                            <div className="concept-item">
                                <strong>{t('howToStart.sec0.clause.term')}</strong> {t('howToStart.sec0.clause.def')}
                            </div>
                            <div className="concept-item">
                                <strong>{t('howToStart.sec0.mainSubordinate.term')}</strong> {t('howToStart.sec0.mainSubordinate.def')}
                            </div>
                        </div>
                    </section>

                    <div className="part-divider">
                        <span>{t('howToStart.part1.badge')}</span>
                        <h4>{t('howToStart.part1.title')}</h4>
                    </div>

                    <section className="guide-section">
                        <h3>{t('howToStart.part1.sec1.title')}</h3>
                        <p className="section-desc">{t('howToStart.part1.sec1.desc')}</p>
                        <ul className="detail-list">
                            <li><strong>{t('howToStart.part1.sec1.inventory.term')}</strong> {t('howToStart.part1.sec1.inventory.def')}
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> {t('howToStart.part1.sec1.inventory.boxTitle')}</div>
                                    <p>{t('howToStart.part1.sec1.inventory.boxText')}</p>
                                </div>
                            </li>
                            <li>
                                <strong>{t('howToStart.part1.sec1.syllable.term')}</strong> {t('howToStart.part1.sec1.syllable.def')}
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> {t('howToStart.part1.sec1.syllable.boxTitle')}</div>
                                    <p>{t('howToStart.part1.sec1.syllable.boxJapanese')}</p>
                                    <p>{t('howToStart.part1.sec1.syllable.boxGeorgian')}</p>
                                </div>
                            </li>
                            <li><strong>{t('howToStart.part1.sec1.phonotactics.term')}</strong> {t('howToStart.part1.sec1.phonotactics.def')}</li>
                            <li><strong>{t('howToStart.part1.sec1.allophony.term')}</strong> {t('howToStart.part1.sec1.allophony.def')}</li>
                        </ul>
                    </section>

                    <section className="guide-section">
                        <h3>{t('howToStart.part1.sec2.title')}</h3>
                        <ul className="detail-list">
                            <li>
                                <strong>{t('howToStart.part1.sec2.tone.term')}</strong> {t('howToStart.part1.sec2.tone.def')}
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> {t('howToStart.part1.sec2.tone.boxTitle')}</div>
                                    <p>{t('howToStart.part1.sec2.tone.boxText')}</p>
                                    <div className="visual-row">
                                        <div className="visual-item">
                                            <StressWave word="ma" tone="high" width="40px" height="20px" />
                                            <span>{t('howToStart.part1.sec2.tone.mother')}</span>
                                        </div>
                                        <div className="visual-item">
                                            <StressWave word="ma" tone="rising" width="40px" height="20px" />
                                            <span>{t('howToStart.part1.sec2.tone.hemp')}</span>
                                        </div>
                                        <div className="visual-item">
                                            <StressWave word="ma" tone="dipping" width="40px" height="20px" />
                                            <span>{t('howToStart.part1.sec2.tone.horse')}</span>
                                        </div>
                                        <div className="visual-item">
                                            <StressWave word="ma" tone="falling" width="40px" height="20px" />
                                            <span>{t('howToStart.part1.sec2.tone.scold')}</span>
                                        </div>
                                    </div>
                                </div>
                            </li>
                            <li><strong>{t('howToStart.part1.sec2.stress.term')}</strong> {t('howToStart.part1.sec2.stress.def')}
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> {t('howToStart.part1.sec2.stress.boxTitle')}</div>
                                    <p>{t('howToStart.part1.sec2.stress.fixed')}</p>
                                    <p>{t('howToStart.part1.sec2.stress.lexical')}</p>
                                </div>
                            </li>
                        </ul>
                    </section>

                    <div className="part-divider">
                        <span>{t('howToStart.part2.badge')}</span>
                        <h4>{t('howToStart.part2.title')}</h4>
                    </div>

                    <section className="guide-section">
                        <h3>{t('howToStart.part2.sec3.title')}</h3>
                        <p className="section-desc">{t('howToStart.part2.sec3.desc')}</p>
                        <ul className="detail-list">
                            <li><strong>{t('howToStart.part2.sec3.isolating.term')}</strong> {t('howToStart.part2.sec3.isolating.def')} 
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> {t('howToStart.part2.sec3.isolating.boxTitle')}</div>
                                    <p>{t('howToStart.part2.sec3.isolating.boxText')}</p>
                                </div>
                            </li>
                            <li><strong>{t('howToStart.part2.sec3.agglutinating.term')}</strong> {t('howToStart.part2.sec3.agglutinating.def')} 
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> {t('howToStart.part2.sec3.agglutinating.boxTitle')}</div>
                                    <p>{t('howToStart.part2.sec3.agglutinating.boxText')}</p>
                                </div>
                            </li>
                            <li><strong>{t('howToStart.part2.sec3.fusional.term')}</strong> {t('howToStart.part2.sec3.fusional.def')} 
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> {t('howToStart.part2.sec3.fusional.boxTitle')}</div>
                                    <p>{t('howToStart.part2.sec3.fusional.boxText')}</p>
                                </div>
                            </li>
                            <li><strong>{t('howToStart.part2.sec3.polysynthetic.term')}</strong> {t('howToStart.part2.sec3.polysynthetic.def')} 
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> {t('howToStart.part2.sec3.polysynthetic.boxTitle')}</div>
                                    <p>{t('howToStart.part2.sec3.polysynthetic.boxText')}</p>
                                </div>
                            </li>
                        </ul>
                        <div className="info-box">
                            <Lightbulb size={16} />
                            <span>{t('howToStart.part2.sec3.note')}</span>
                        </div>
                    </section>

                    <section className="guide-section">
                        <h3>{t('howToStart.part2.sec4.title')}</h3>
                        <ul className="detail-list">
                            <li><strong>{t('howToStart.part2.sec4.compounding.term')}</strong> {t('howToStart.part2.sec4.compounding.def')}
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> {t('howToStart.part2.sec4.compounding.boxTitle')}</div>
                                    <p>{t('howToStart.part2.sec4.compounding.boxText')}</p>
                                </div>
                            </li>
                            <li><strong>{t('howToStart.part2.sec4.reduplication.term')}</strong> {t('howToStart.part2.sec4.reduplication.def')}
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> {t('howToStart.part2.sec4.reduplication.boxTitle')}</div>
                                    <p>{t('howToStart.part2.sec4.reduplication.boxText')}</p>
                                </div>
                            </li>
                            <li><strong>{t('howToStart.part2.sec4.blending.term')}</strong> {t('howToStart.part2.sec4.blending.def')}
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> {t('howToStart.part2.sec4.blending.boxTitle')}</div>
                                    <p>{t('howToStart.part2.sec4.blending.boxText')}</p>
                                </div>
                            </li>
                        </ul>
                    </section>

                    <section className="guide-section">
                        <h3>{t('howToStart.part2.sec5.title')}</h3>
                        <ul className="detail-list">
                            <li>{t('howToStart.part2.sec5.prefix')}</li>
                            <li>{t('howToStart.part2.sec5.suffix')}</li>
                            <li><strong>{t('howToStart.part2.sec5.infix.term')}</strong> {t('howToStart.part2.sec5.infix.def')}
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> {t('howToStart.part2.sec5.infix.boxTitle')}</div>
                                    <p>{t('howToStart.part2.sec5.infix.boxText')}</p>
                                </div>
                            </li>
                            <li><strong>{t('howToStart.part2.sec5.circumfix.term')}</strong> {t('howToStart.part2.sec5.circumfix.def')}
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> {t('howToStart.part2.sec5.circumfix.boxTitle')}</div>
                                    <p>{t('howToStart.part2.sec5.circumfix.boxText')}</p>
                                </div>
                            </li>
                            <li><strong>{t('howToStart.part2.sec5.transfix.term')}</strong> {t('howToStart.part2.sec5.transfix.def')}
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> {t('howToStart.part2.sec5.transfix.boxTitle')}</div>
                                    <p>{t('howToStart.part2.sec5.transfix.boxText')}</p>
                                </div>
                            </li>
                        </ul>
                    </section>

                    <section className="guide-section">
                        <h3>{t('howToStart.part2.sec6.title')}</h3>
                        <ul className="detail-list">
                            <li>{t('howToStart.part2.sec6.negation')}</li>
                            <li>{t('howToStart.part2.sec6.manner')}</li>
                            <li>{t('howToStart.part2.sec6.agent')}</li>
                            <li>{t('howToStart.part2.sec6.nominalization')}</li>
                            <li>{t('howToStart.part2.sec6.abstract')}</li>
                            <li>{t('howToStart.part2.sec6.place')}</li>
                            <li>{t('howToStart.part2.sec6.possession')}</li>
                            <li><strong>{t('howToStart.part2.sec6.degree.term')}</strong>
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> {t('howToStart.part2.sec6.degree.boxTitle')}</div>
                                    <p>{t('howToStart.part2.sec6.degree.boxText')}</p>
                                </div>
                            </li>
                            <li>{t('howToStart.part2.sec6.plurality')}</li>
                            <li><strong>{t('howToStart.part2.sec6.causative.term')}</strong>
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> {t('howToStart.part2.sec6.causative.boxTitle')}</div>
                                    <p>{t('howToStart.part2.sec6.causative.boxText')}</p>
                                </div>
                            </li>
                        </ul>
                    </section>

                    <section className="guide-section">
                        <h3>{t('howToStart.part2.sec7.title')}</h3>
                        <ul className="detail-list">
                            <li><strong>{t('howToStart.part2.sec7.vowelHarmony.term')}</strong> {t('howToStart.part2.sec7.vowelHarmony.def')}
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> {t('howToStart.part2.sec7.vowelHarmony.boxTitle')}</div>
                                    <p>{t('howToStart.part2.sec7.vowelHarmony.boxText')}</p>
                                </div>
                            </li>
                            <li><strong>{t('howToStart.part2.sec7.mutation.term')}</strong> {t('howToStart.part2.sec7.mutation.def')}
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> {t('howToStart.part2.sec7.mutation.boxTitle')}</div>
                                    <p>{t('howToStart.part2.sec7.mutation.boxText')}</p>
                                </div>
                            </li>
                        </ul>
                    </section>

                    <div className="part-divider">
                        <span>{t('howToStart.part3.badge')}</span>
                        <h4>{t('howToStart.part3.title')}</h4>
                    </div>

                    <section className="guide-section">
                        <h3>{t('howToStart.part3.sec8.title')}</h3>
                        <ul className="detail-list">
                            <li>{t('howToStart.part3.sec8.fixed')}</li>
                            <li><strong>{t('howToStart.part3.sec8.free.term')}</strong> {t('howToStart.part3.sec8.free.def')}
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> {t('howToStart.part3.sec8.free.boxTitle')}</div>
                                    <p>{t('howToStart.part3.sec8.free.boxText')}</p>
                                </div>
                            </li>
                        </ul>
                    </section>

                    <section className="guide-section">
                        <h3>{t('howToStart.part3.sec9.title')}</h3>
                        <p className="section-desc">{t('howToStart.part3.sec9.desc')}</p>
                        <ul className="detail-list">
                            <li>{t('howToStart.part3.sec9.nomAcc')}</li>
                            <li><strong>{t('howToStart.part3.sec9.ergAbs.term')}</strong> {t('howToStart.part3.sec9.ergAbs.def')}
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> {t('howToStart.part3.sec9.ergAbs.boxTitle')}</div>
                                    <p>{t('howToStart.part3.sec9.ergAbs.boxText1')}</p>
                                    <p>{t('howToStart.part3.sec9.ergAbs.boxText2')}</p>
                                </div>
                            </li>
                            <li>{t('howToStart.part3.sec9.activeStative')}</li>
                            <li>{t('howToStart.part3.sec9.tripartite')}</li>
                        </ul>
                    </section>

                    <section className="guide-section">
                        <h3>{t('howToStart.part3.sec10.title')}</h3>
                        <ul className="detail-list">
                            <li>{t('howToStart.part3.sec10.passive')}</li>
                            <li>{t('howToStart.part3.sec10.antipassive')}</li>
                            <li>{t('howToStart.part3.sec10.middle')}</li>
                            <li><strong>{t('howToStart.part3.sec10.applicative.term')}</strong> {t('howToStart.part3.sec10.applicative.def')}
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> {t('howToStart.part3.sec10.applicative.boxTitle')}</div>
                                    <p>{t('howToStart.part3.sec10.applicative.boxText')}</p>
                                </div>
                            </li>
                            <li>{t('howToStart.part3.sec10.causative')}</li>
                        </ul>
                    </section>

                    <section className="guide-section">
                        <h3>{t('howToStart.part3.sec11.title')}</h3>
                        <ul className="detail-list">
                            <li><strong>{t('howToStart.part3.sec11.negation.term')}</strong> {t('howToStart.part3.sec11.negation.def')}
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> {t('howToStart.part3.sec11.negation.boxTitle')}</div>
                                    <p>{t('howToStart.part3.sec11.negation.boxText')}</p>
                                </div>
                            </li>
                            <li>{t('howToStart.part3.sec11.questions')}</li>
                            <li>{t('howToStart.part3.sec11.relative')}</li>
                            <li><strong>{t('howToStart.part3.sec11.serial.term')}</strong> {t('howToStart.part3.sec11.serial.def')}
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> {t('howToStart.part3.sec11.serial.boxTitle')}</div>
                                    <p>{t('howToStart.part3.sec11.serial.boxText')}</p>
                                </div>
                            </li>
                            <li>{t('howToStart.part3.sec11.switchRef')}</li>
                        </ul>
                    </section>

                    <section className="guide-section">
                        <h3>{t('howToStart.part3.sec12.title')}</h3>
                        <ul className="detail-list">
                            <li>{t('howToStart.part3.sec12.copula')}</li>
                            <li>{t('howToStart.part3.sec12.headDirection')}</li>
                            <li>{t('howToStart.part3.sec12.modals')}</li>
                            <li>{t('howToStart.part3.sec12.nonLinearity')}</li>
                        </ul>
                    </section>

                    <div className="part-divider">
                        <span>{t('howToStart.part4.badge')}</span>
                        <h4>{t('howToStart.part4.title')}</h4>
                    </div>

                    <section className="guide-section">
                        <h3>{t('howToStart.part4.sec13.title')}</h3>
                        <div className="sub-section">
                            <h4>{t('howToStart.part4.sec13.tense.heading')}</h4>
                            <ul>
                                <li>{t('howToStart.part4.sec13.tense.absolute')}</li>
                                <li>{t('howToStart.part4.sec13.tense.binary')}</li>
                                <li>{t('howToStart.part4.sec13.tense.distance')}</li>
                            </ul>
                        </div>
                        <div className="sub-section">
                            <h4>{t('howToStart.part4.sec13.aspect.heading')}</h4>
                            <ul>
                                <li>{t('howToStart.part4.sec13.aspect.perfective')}</li>
                                <li>{t('howToStart.part4.sec13.aspect.continuous')}</li>
                                <li>{t('howToStart.part4.sec13.aspect.habitual')}</li>
                                <li>{t('howToStart.part4.sec13.aspect.perfect')}</li>
                                <li>{t('howToStart.part4.sec13.aspect.iterative')}</li>
                                <li>{t('howToStart.part4.sec13.aspect.inchoative')}</li>
                            </ul>
                        </div>
                        <div className="sub-section">
                            <h4>{t('howToStart.part4.sec13.mood.heading')}</h4>
                            <ul>
                                <li>{t('howToStart.part4.sec13.mood.indicative')}</li>
                                <li>{t('howToStart.part4.sec13.mood.subjunctive')}</li>
                                <li>{t('howToStart.part4.sec13.mood.conditional')}</li>
                                <li>{t('howToStart.part4.sec13.mood.imperative')}</li>
                                <li>{t('howToStart.part4.sec13.mood.optative')}</li>
                                <li>{t('howToStart.part4.sec13.mood.interrogative')}</li>
                            </ul>
                        </div>
                        <div className="sub-section">
                            <h4>{t('howToStart.part4.sec13.evidentiality.heading')}</h4>
                            <ul>
                                <li>{t('howToStart.part4.sec13.evidentiality.visual')}</li>
                                <li>{t('howToStart.part4.sec13.evidentiality.nonVisual')}</li>
                                <li>{t('howToStart.part4.sec13.evidentiality.inferential')}</li>
                                <li>{t('howToStart.part4.sec13.evidentiality.reportative')}</li>
                            </ul>
                        </div>
                    </section>

                    <div className="part-divider">
                        <span>{t('howToStart.part5.badge')}</span>
                        <h4>{t('howToStart.part5.title')}</h4>
                    </div>

                    <section className="guide-section">
                        <h3>{t('howToStart.part5.sec14.title')}</h3>
                        <div className="sub-section">
                            <h4>{t('howToStart.part5.sec14.central.heading')}</h4>
                            <ul>
                                <li>{t('howToStart.part5.sec14.central.text')}</li>
                            </ul>
                        </div>
                        <div className="sub-section">
                            <h4>{t('howToStart.part5.sec14.possession.heading')}</h4>
                            <ul>
                                <li>{t('howToStart.part5.sec14.possession.text')}</li>
                            </ul>
                        </div>
                        <div className="sub-section">
                            <h4>{t('howToStart.part5.sec14.circumstantial.heading')}</h4>
                            <ul>
                                <li>{t('howToStart.part5.sec14.circumstantial.text')}</li>
                            </ul>
                        </div>
                    </section>

                    <section className="guide-section">
                        <h3>{t('howToStart.part5.sec15.title')}</h3>
                        <ul className="detail-list">
                            <li>{t('howToStart.part5.sec15.determination')}</li>
                            <li>{t('howToStart.part5.sec15.numSystems')}</li>
                            <li>{t('howToStart.part5.sec15.numberCats')}</li>
                            <li>{t('howToStart.part5.sec15.classifiers')}</li>
                            <li>{t('howToStart.part5.sec15.quantifiers')}</li>
                        </ul>
                    </section>

                    <section className="guide-section">
                        <h3>{t('howToStart.part5.sec16.title')}</h3>
                        <ul className="detail-list">
                            <li>{t('howToStart.part5.sec16.person')}</li>
                            <li>{t('howToStart.part5.sec16.inEx')}</li>
                            <li>{t('howToStart.part5.sec16.animacy')}</li>
                            <li>{t('howToStart.part5.sec16.gender')}</li>
                            <li>{t('howToStart.part5.sec16.reflexive')}</li>
                        </ul>
                    </section>

                    <section className="guide-section">
                        <h3>{t('howToStart.part5.sec17.title')}</h3>
                        <ul className="detail-list">
                            <li>{t('howToStart.part5.sec17.stative')}</li>
                            <li>{t('howToStart.part5.sec17.nounClasses')}</li>
                        </ul>
                    </section>

                    <div className="part-divider">
                        <span>{t('howToStart.part6.badge')}</span>
                        <h4>{t('howToStart.part6.title')}</h4>
                    </div>

                    <section className="guide-section">
                        <h3>{t('howToStart.part6.sec18.title')}</h3>
                        <ul className="detail-list">
                            <li><strong>{t('howToStart.part6.sec18.demonstrative.term')}</strong> {t('howToStart.part6.sec18.demonstrative.def')}
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> {t('howToStart.part6.sec18.demonstrative.boxTitle')}</div>
                                    <p>{t('howToStart.part6.sec18.demonstrative.boxText')}</p>
                                </div>
                            </li>
                            <li>{t('howToStart.part6.sec18.vertical')}</li>
                        </ul>
                    </section>

                    <section className="guide-section">
                        <h3>{t('howToStart.part6.sec19.title')}</h3>
                        <ul className="detail-list">
                            <li>{t('howToStart.part6.sec19.honorifics')}</li>
                            <li>{t('howToStart.part6.sec19.register')}</li>
                            <li>{t('howToStart.part6.sec19.taboos')}</li>
                        </ul>
                    </section>

                    <section className="guide-section">
                        <h3>{t('howToStart.part6.sec20.title')}</h3>
                        <ul className="detail-list">
                            <li>{t('howToStart.part6.sec20.kinship')}</li>
                            <li>{t('howToStart.part6.sec20.color')}</li>
                        </ul>
                    </section>

                    <div className="part-divider">
                        <span>{t('howToStart.part7.badge')}</span>
                        <h4>{t('howToStart.part7.title')}</h4>
                    </div>

                    <section className="guide-section">
                        <h3>{t('howToStart.part7.sec21.title')}</h3>
                        <ul className="detail-list">
                            <li>{t('howToStart.part7.sec21.sysType')}</li>
                            <li>{t('howToStart.part7.sec21.direction')}</li>
                        </ul>
                    </section>

                    <section className="guide-section">
                        <h3>{t('howToStart.part7.sec22.title')}</h3>
                        <ul className="detail-list">
                            <li>{t('howToStart.part7.sec22.soundChange')}</li>
                            <li>{t('howToStart.part7.sec22.loans')}</li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
}
