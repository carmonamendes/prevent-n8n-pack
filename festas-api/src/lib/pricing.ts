export interface Taxas {
  taxaMontagem: number;
  taxaEntregaBase: number;
  taxaEntregaKm: number;
}

export interface CalculoInput {
  precoKit: number;
  distanciaKm: number;
  querMontagem: boolean;
}

export interface CalculoResult {
  taxaEntrega: number;
  taxaMontagem: number;
  valorKit: number;
  valorTotal: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Calcula o total da reserva (fonte de verdade no servidor).
 * Entrega = base + (km × valor por km), cobrada só quando há distância > 0.
 */
export function calcularTotais(taxas: Taxas, input: CalculoInput): CalculoResult {
  const km = Math.max(0, input.distanciaKm || 0);
  const taxaEntrega = km > 0 ? round2(taxas.taxaEntregaBase + taxas.taxaEntregaKm * km) : 0;
  const taxaMontagem = input.querMontagem ? round2(taxas.taxaMontagem) : 0;
  const valorKit = round2(input.precoKit);
  const valorTotal = round2(valorKit + taxaEntrega + taxaMontagem);
  return { taxaEntrega, taxaMontagem, valorKit, valorTotal };
}
