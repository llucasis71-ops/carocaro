import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Car, 
  Fuel, 
  Wrench, 
  ShieldCheck, 
  TrendingUp, 
  Share2, 
  Copy, 
  MessageCircle, 
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Info,
  Pizza,
  Coins,
  Clock,
  RefreshCw,
  ArrowRight
} from 'lucide-react';

export default function App() {
  const [carValue, setCarValue] = useState<string>('');
  const [consumption, setConsumption] = useState<string>('');
  const [gasPrice, setGasPrice] = useState<string>('');
  const [kmPerMonth, setKmPerMonth] = useState<string>('');
  const [salary, setSalary] = useState<string>('');
  const [results, setResults] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const getFieldTip = (name: string, value: string) => {
    const val = parseFloat(value);
    if (isNaN(val)) return null;

    switch (name) {
      case 'carValue':
        if (val < 10000) return { text: "Valor baixo. É um carro usado ou moto?", type: 'info' };
        if (val > 150000) return { text: "Carro de alto padrão. O seguro será pesado!", type: 'warning' };
        break;
      case 'consumption':
        if (val < 7) return { text: "Consumo alto! Prepare o bolso para o posto.", type: 'warning' };
        if (val > 18) return { text: "Excelente economia. Híbrido ou 1.0?", type: 'success' };
        break;
      case 'gasPrice':
        if (val > 7) return { text: "Gasolina cara! Isso vai doer no cálculo.", type: 'warning' };
        break;
      case 'kmPerMonth':
        if (val > 2500) return { text: "Você roda muito! A manutenção será frequente.", type: 'warning' };
        if (val < 300) return { text: "Roda pouco. Talvez Uber compense mais?", type: 'info' };
        break;
      case 'salary':
        if (val > 0 && val < 2000) return { text: "Cuidado: o carro pode comprometer sua renda.", type: 'warning' };
        break;
    }
    return null;
  };

  const FieldTip = ({ name, value }: { name: string, value: string }) => {
    const tip = getFieldTip(name, value);
    if (!tip) return <div className="h-5" />; // Spacer

    const colors = {
      info: 'text-blue-400',
      warning: 'text-orange-400',
      success: 'text-emerald-400'
    };

    return (
      <motion.div 
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className={`text-[11px] font-medium flex items-center gap-1 mt-1 ${colors[tip.type as keyof typeof colors]}`}
      >
        <Info className="w-3 h-3" />
        {tip.text}
      </motion.div>
    );
  };

  const Tooltip = ({ children, text }: { children: React.ReactNode, text: string }) => {
    const [show, setShow] = useState(false);
    return (
      <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
        {children}
        <AnimatePresence>
          {show && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 5 }}
              className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-white text-black text-[10px] font-bold rounded-lg shadow-xl whitespace-nowrap pointer-events-none"
            >
              {text}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const calculate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCalculating(true);
    
    // Simulate calculation time for impact
    setTimeout(() => {
      const val = parseFloat(carValue);
      const cons = parseFloat(consumption);
      const gas = parseFloat(gasPrice);
      const km = parseFloat(kmPerMonth);
      const sal = parseFloat(salary) || 0;

      const fuelMonthly = (km / cons) * gas;
      const maintenanceMonthly = (val * 0.05) / 12;
      const insuranceMonthly = (val * 0.03) / 12;
      const totalMonthly = fuelMonthly + maintenanceMonthly + insuranceMonthly;
      const costPerDay = totalMonthly / 30;
      const salaryPercentage = sal > 0 ? (totalMonthly / sal) * 100 : 0;
      const workDaysToPay = sal > 0 ? (totalMonthly / sal) * 22 : 0;

      // Viral Comparisons
      const pizzasPerMonth = Math.floor(totalMonthly / 60); // R$ 60 per pizza
      const investment5Years = totalMonthly * 12 * 5 * 1.4; // Rough 40% growth estimate
      const workHoursPerMonth = sal > 0 ? (totalMonthly / (sal / 160)) : 0; // 160h work month
      const iphonesPerYear = Math.floor((totalMonthly * 12) / 5000); // R$ 5000 per iPhone
      const streamingSubs = Math.floor(totalMonthly / 40); // R$ 40 per sub
      const coffeesPerMonth = Math.floor(totalMonthly / 15); // R$ 15 per coffee

      setResults({
        fuelMonthly,
        maintenanceMonthly,
        insuranceMonthly,
        totalMonthly,
        costPerDay,
        salaryPercentage,
        workDaysToPay,
        pizzasPerMonth,
        investment5Years,
        workHoursPerMonth,
        iphonesPerYear,
        streamingSubs,
        coffeesPerMonth
      });
      setIsCalculating(false);
      
      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, 1500);
  };

  const shareOnWhatsApp = () => {
    const text = `Eu achava que sabia quanto gastava com meu carro… mas descobri que são R$ ${results.totalMonthly.toFixed(2)} por mês 😳 Faz esse teste: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const resetTest = () => {
    setResults(null);
    setCarValue('');
    setConsumption('');
    setGasPrice('');
    setKmPerMonth('');
    setSalary('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copiado!');
  };

  return (
    <div className="min-h-screen font-sans selection:bg-red-500/30">
      {/* SEO Meta Tags (handled by metadata.json and index.html usually, but good for structure) */}
      
      {/* Header */}
      <header className="pt-8 pb-4 px-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-white/5 border border-white/10 mb-6"
        >
          <div className="relative flex items-center justify-center shrink-0">
            <Car className="w-9 h-9 text-red-500" strokeWidth={2.5} />
            <span className="absolute text-[11px] font-black text-black mb-0.5">$</span>
          </div>
          <span className="font-display font-bold tracking-tighter text-2xl">Caro<span className="text-red-500">Carro</span></span>
        </motion.div>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-white/60 text-sm font-medium uppercase tracking-widest"
        >
          A verdade que ninguém te conta sobre ter um carro
        </motion.p>
      </header>

      <main className="max-w-2xl mx-auto px-6 pb-24">
        {/* Hero */}
        <section className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="font-display text-4xl md:text-6xl font-black leading-tight mb-4 text-gradient"
          >
            Você sabe quanto seu carro está <span className="text-red-500">sugando</span> do seu dinheiro?
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-white/40 text-sm md:text-base font-medium mb-2"
          >
            Leva menos de 10 segundos. A maioria das pessoas se surpreende com o resultado.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-wider"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Mais de 10.000 pessoas já fizeram esse teste
          </motion.div>
          
          {/* AdSense Placeholder Top */}
          <div className="w-full h-24 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl border border-white/10 flex flex-col items-center justify-center text-white/20 mb-12 relative overflow-hidden group">
            <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-[10px] uppercase tracking-[0.2em] mb-1 font-bold">Publicidade</span>
            <span className="text-xs font-medium">Google AdSense</span>
          </div>
        </section>

        {/* Form */}
        <section className="glass-card p-8 mb-12">
          <form onSubmit={calculate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-white/70 ml-1">Valor do carro (R$)</label>
                <input 
                  type="number" 
                  required
                  placeholder="Ex: 50000"
                  value={carValue}
                  onChange={(e) => setCarValue(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition-colors"
                />
                <FieldTip name="carValue" value={carValue} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-white/70 ml-1">Consumo (km/l)</label>
                <input 
                  type="number" 
                  required
                  placeholder="Ex: 10"
                  value={consumption}
                  onChange={(e) => setConsumption(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition-colors"
                />
                <FieldTip name="consumption" value={consumption} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-white/70 ml-1">Preço da gasolina (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  placeholder="Ex: 5.80"
                  value={gasPrice}
                  onChange={(e) => setGasPrice(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition-colors"
                />
                <FieldTip name="gasPrice" value={gasPrice} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-white/70 ml-1">Km rodados por mês</label>
                <input 
                  type="number" 
                  required
                  placeholder="Ex: 1000"
                  value={kmPerMonth}
                  onChange={(e) => setKmPerMonth(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition-colors"
                />
                <FieldTip name="kmPerMonth" value={kmPerMonth} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-white/70 ml-1">Seu salário mensal (Opcional)</label>
              <input 
                type="number" 
                placeholder="Ex: 4000"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition-colors"
              />
              <FieldTip name="salary" value={salary} />
            </div>
            
            <button 
              type="submit"
              disabled={isCalculating}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg shadow-lg shadow-red-600/20"
            >
              {isCalculating ? (
                <>
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Calculando impacto...
                </>
              ) : (
                "Descobrir agora"
              )}
            </button>
          </form>
        </section>

        {/* Results Section */}
        <div ref={resultsRef}>
          <AnimatePresence>
            {results && (
              <motion.section 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                {/* Main Impact */}
                <div className="glass-card p-10 text-center relative overflow-hidden border-red-500/40 shadow-2xl shadow-red-500/10">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 animate-gradient-x" />
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <h2 className="text-red-500 font-black uppercase tracking-[0.2em] text-sm">💸 Seu carro está sugando isso todo mês</h2>
                    <Tooltip text="Soma de combustível, manutenção e seguro">
                      <Info className="w-4 h-4 text-white/30 cursor-help" />
                    </Tooltip>
                  </div>
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="font-display text-7xl md:text-9xl font-black mb-6 text-gradient-danger drop-shadow-2xl"
                  >
                    R$ {results.totalMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </motion.div>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold text-white">
                      Em 1 ano, isso vira <span className="text-red-500">R$ {(results.totalMonthly * 12).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span> 😳
                    </p>
                    <p className="text-lg font-medium text-white/60">
                      Isso daria para pagar um aluguel, investir ou viajar todo mês.
                    </p>
                  </div>
                  <div className="mt-6 pt-6 border-t border-white/5">
                    <p className="text-sm text-white/30">
                      Seu carro custa R$ {results.costPerDay.toFixed(2)} por dia. Vale a pena?
                    </p>
                  </div>
                </div>

                {/* Viral Comparisons */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <motion.div 
                    whileHover={{ y: -5 }}
                    className="glass-card p-6 flex flex-col items-center text-center border-white/5"
                  >
                    <Pizza className="w-8 h-8 text-orange-400 mb-3" />
                    <span className="text-xs text-white/40 mb-1 uppercase tracking-wider">Equivale a</span>
                    <span className="font-bold text-xl">{results.pizzasPerMonth} Pizzas 🍕</span>
                    <span className="text-[10px] text-white/20 mt-1">por mês</span>
                  </motion.div>
                  <motion.div 
                    whileHover={{ y: -5 }}
                    className="glass-card p-6 flex flex-col items-center text-center border-white/5"
                  >
                    <Coins className="w-8 h-8 text-emerald-400 mb-3" />
                    <span className="text-xs text-white/40 mb-1 uppercase tracking-wider">Em 5 anos seria</span>
                    <span className="font-bold text-xl text-emerald-400">R$ {results.investment5Years.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                    <span className="text-[10px] text-white/20 mt-1">se fosse investido</span>
                  </motion.div>
                  <motion.div 
                    whileHover={{ y: -5 }}
                    className="glass-card p-6 flex flex-col items-center text-center border-white/5"
                  >
                    <Clock className="w-8 h-8 text-blue-400 mb-3" />
                    <span className="text-xs text-white/40 mb-1 uppercase tracking-wider">Você trabalha</span>
                    <span className="font-bold text-xl">{Math.round(results.workHoursPerMonth)} Horas</span>
                    <span className="text-[10px] text-white/20 mt-1">só para o carro</span>
                  </motion.div>
                  
                  {/* New Comparisons */}
                  <motion.div 
                    whileHover={{ y: -5 }}
                    className="glass-card p-6 flex flex-col items-center text-center border-white/5"
                  >
                    <div className="w-8 h-8 flex items-center justify-center mb-3 text-2xl">📱</div>
                    <span className="text-xs text-white/40 mb-1 uppercase tracking-wider">Daria para comprar</span>
                    <span className="font-bold text-xl">{results.iphonesPerYear} iPhones</span>
                    <span className="text-[10px] text-white/20 mt-1">por ano</span>
                  </motion.div>
                  <motion.div 
                    whileHover={{ y: -5 }}
                    className="glass-card p-6 flex flex-col items-center text-center border-white/5"
                  >
                    <div className="w-8 h-8 flex items-center justify-center mb-3 text-2xl">📺</div>
                    <span className="text-xs text-white/40 mb-1 uppercase tracking-wider">Pagaria</span>
                    <span className="font-bold text-xl">{results.streamingSubs} Assinaturas</span>
                    <span className="text-[10px] text-white/20 mt-1">de streaming</span>
                  </motion.div>
                  <motion.div 
                    whileHover={{ y: -5 }}
                    className="glass-card p-6 flex flex-col items-center text-center border-white/5"
                  >
                    <div className="w-8 h-8 flex items-center justify-center mb-3 text-2xl">☕</div>
                    <span className="text-xs text-white/40 mb-1 uppercase tracking-wider">Equivale a</span>
                    <span className="font-bold text-xl">{results.coffeesPerMonth} Cafés</span>
                    <span className="text-[10px] text-white/20 mt-1">por mês</span>
                  </motion.div>
                </div>

                {/* Salary Impact */}
                {results.salaryPercentage > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className={`p-6 rounded-2xl border flex items-start gap-4 ${
                      results.salaryPercentage > 20 
                        ? 'bg-red-500/10 border-red-500/20' 
                        : 'bg-emerald-500/10 border-emerald-500/20'
                    }`}
                  >
                    {results.salaryPercentage > 20 ? (
                      <Tooltip text="Seu custo com carro está acima do recomendado (20%)">
                        <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-1 cursor-help" />
                      </Tooltip>
                    ) : (
                      <Tooltip text="Seu custo com carro está dentro de um limite saudável">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-1 cursor-help" />
                      </Tooltip>
                    )}
                    <div>
                      <h3 className={`font-bold text-lg ${results.salaryPercentage > 20 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {results.salaryPercentage > 20 
                          ? 'Você pode estar se sabotando financeiramente.' 
                          : results.salaryPercentage > 10 
                            ? 'Isso já está pesando mais do que deveria.' 
                            : 'Você está controlando bem esse custo.'}
                      </h3>
                      <p className="text-white/70">
                        Isso representa <span className="font-bold text-white">{results.salaryPercentage.toFixed(1)}%</span> do seu salário. 
                        Você trabalha <span className="font-bold text-white">{Math.round(results.workDaysToPay)} dias</span> por mês só para manter seu carro.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="glass-card glass-card-interactive p-6 flex flex-col items-center text-center">
                    <Tooltip text="Gasto estimado com gasolina baseado no seu consumo">
                      <Fuel className="w-6 h-6 text-white/40 mb-3 cursor-help" />
                    </Tooltip>
                    <span className="text-xs uppercase tracking-wider text-white/40 mb-1">Combustível</span>
                    <span className="font-bold text-lg">R$ {results.fuelMonthly.toFixed(2)}</span>
                  </div>
                  <div className="glass-card glass-card-interactive p-6 flex flex-col items-center text-center">
                    <Tooltip text="Reserva estimada de 5% do valor do carro ao ano">
                      <Wrench className="w-6 h-6 text-white/40 mb-3 cursor-help" />
                    </Tooltip>
                    <span className="text-xs uppercase tracking-wider text-white/40 mb-1">Manutenção</span>
                    <span className="font-bold text-lg">R$ {results.maintenanceMonthly.toFixed(2)}</span>
                  </div>
                  <div className="glass-card glass-card-interactive p-6 flex flex-col items-center text-center">
                    <Tooltip text="Estimativa de 3% do valor do carro ao ano">
                      <ShieldCheck className="w-6 h-6 text-white/40 mb-3 cursor-help" />
                    </Tooltip>
                    <span className="text-xs uppercase tracking-wider text-white/40 mb-1">Seguro</span>
                    <span className="font-bold text-lg">R$ {results.insuranceMonthly.toFixed(2)}</span>
                  </div>
                </div>

                {/* Share */}
                <div className="space-y-4">
                  <button 
                    onClick={shareOnWhatsApp}
                    className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-lg shadow-xl shadow-emerald-500/20"
                  >
                    <MessageCircle className="w-6 h-6" />
                    😳 Mostrar isso pra alguém
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={copyLink}
                      className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      <Copy className="w-4 h-4" />
                      Copiar Resultado
                    </button>
                    <button 
                      onClick={resetTest}
                      className="bg-white/5 hover:bg-white/10 text-white/60 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Novo Cenário
                    </button>
                  </div>
                </div>

                {/* AdSense Placeholder Middle */}
                <div className="w-full h-32 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl border border-white/10 flex flex-col items-center justify-center text-white/20 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="text-[10px] uppercase tracking-[0.2em] mb-1 font-bold">Publicidade</span>
                  <span className="text-xs font-medium">Google AdSense</span>
                </div>

                {/* Recommendations */}
                <div className="space-y-4">
                  <h3 className="font-display text-xl font-bold flex items-center gap-2">
                    {results.salaryPercentage > 20 ? (
                      <>
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                        💸 Como reduzir esse custo AGORA
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-5 h-5 text-red-500" />
                        Recomendado para você
                      </>
                    )}
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <a href="#" className="glass-card glass-card-interactive p-4 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                          <ShieldCheck className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">Seguro Auto Barato</p>
                          <p className="text-xs text-white/50">Economize até 40% no seguro</p>
                        </div>
                      </div>
                      <ChevronDown className="w-5 h-5 text-white/20 group-hover:text-white transition-colors -rotate-90" />
                    </a>
                    {results.salaryPercentage > 20 ? (
                      <a href="#" className="glass-card glass-card-interactive p-4 flex items-center justify-between group border-emerald-500/20">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">Controle Financeiro</p>
                            <p className="text-xs text-white/50">O melhor app para seus gastos</p>
                          </div>
                        </div>
                        <ChevronDown className="w-5 h-5 text-white/20 group-hover:text-white transition-colors -rotate-90" />
                      </a>
                    ) : (
                      <a href="#" className="glass-card glass-card-interactive p-4 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">Financiamento Facilitado</p>
                            <p className="text-xs text-white/50">As melhores taxas do mercado</p>
                          </div>
                        </div>
                        <ChevronDown className="w-5 h-5 text-white/20 group-hover:text-white transition-colors -rotate-90" />
                      </a>
                    )}
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* Tips Section */}
        <section className="mt-24 space-y-12">
          <div className="text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">O que você poderia fazer com esse dinheiro?</h2>
            <p className="text-white/60">A verdade dói, mas liberta. Veja como transformar esse custo em patrimônio.</p>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <div className="glass-card glass-card-interactive p-8 flex gap-6 items-center group">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                <TrendingUp className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">Investir para o Futuro</h3>
                <p className="text-sm text-white/60 leading-relaxed">Se você investisse metade desse valor mensal em um fundo de índice (ETF), em 10 anos você teria o suficiente para comprar um carro novo à vista ou dar entrada em um imóvel.</p>
              </div>
            </div>
            <div className="glass-card glass-card-interactive p-8 flex gap-6 items-center group">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
                <Share2 className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">Viajar pelo Mundo</h3>
                <p className="text-sm text-white/60 leading-relaxed">O custo anual do seu carro equivale a pelo menos duas viagens internacionais de alto padrão. Já pensou em conhecer a Europa ou o Japão com o dinheiro que "some" na garagem?</p>
              </div>
            </div>
            <div className="glass-card glass-card-interactive p-8 flex gap-6 items-center group">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center shrink-0 group-hover:bg-red-500/20 transition-colors">
                <ShieldCheck className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">Quitar Dívidas</h3>
                <p className="text-sm text-white/60 leading-relaxed">Eliminar juros de cartão de crédito ou cheque especial usando o valor que você gasta com o carro pode te economizar décadas de escravidão financeira.</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-3xl p-8 text-center border border-white/10">
            <h3 className="font-display text-2xl font-bold mb-4">Como reduzir o custo hoje?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold shrink-0 mt-1">1</div>
                <p className="text-sm text-white/70"><strong>Manutenção Preventiva:</strong> Trocar o óleo e calibrar pneus reduz o consumo em até 10%.</p>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold shrink-0 mt-1">2</div>
                <p className="text-sm text-white/70"><strong>Apps de Desconto:</strong> Use postos com cashback e divida caronas para rachar o combustível.</p>
              </div>
            </div>
          </div>
        </section>

        {/* SEO Text */}
        <section className="mt-24 pt-12 border-t border-white/5 text-center">
          <h3 className="text-lg font-bold mb-4">Por que calcular o custo de carro?</h3>
          <p className="text-sm text-white/40 leading-relaxed max-w-lg mx-auto">
            Muitas pessoas olham apenas para a parcela do financiamento ou o gasto no posto. 
            No entanto, o <strong>custo de carro</strong> envolve depreciação, <strong>gasto com carro</strong> em manutenções e impostos. 
            Saber o <strong>custo mensal veículo</strong> é o primeiro passo para uma vida financeira saudável em 2026.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 text-center text-white/20 text-xs border-t border-white/5">
        <p>© 2026 CaroCarro - A verdade sobre seu bolso.</p>
        <div className="flex justify-center gap-4 mt-4">
          <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
          <a href="#" className="hover:text-white transition-colors">Privacidade</a>
        </div>
      </footer>
    </div>
  );
}
