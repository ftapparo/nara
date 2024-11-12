// services/vehicleService.ts
import axios from 'axios';
import FormData from 'form-data';

const TABELA_REFERENCIA = 315;
const TIPO_VEICULO = 1;

export async function fetchVehicleBrands(): Promise<any> {
    const url = 'https://veiculos.fipe.org.br/api/veiculos/ConsultarMarcas';
    const formData = new FormData();
    formData.append('codigoTabelaReferencia', TABELA_REFERENCIA);
    formData.append('codigoTipoVeiculo', TIPO_VEICULO);

    const response = await axios.post(url, formData, { headers: formData.getHeaders() });
    return response.data;
}

export async function fetchVehicleModels(codigoMarca: string): Promise<any[]> {
    const url = 'https://veiculos.fipe.org.br/api/veiculos/ConsultarModelos';
    const formData = new FormData();
    formData.append('codigoTabelaReferencia', TABELA_REFERENCIA);
    formData.append('codigoTipoVeiculo', TIPO_VEICULO);
    formData.append('codigoMarca', codigoMarca);

    const response = await axios.post(url, formData, { headers: formData.getHeaders() });

    // Filtra para remover duplicados e manter apenas a primeira palavra do Label
    const modelosUnicos = filterUniqueModels(response.data.Modelos);
    return modelosUnicos;
}

// Função para filtrar e transformar para a primeira palavra do Label
function filterUniqueModels(models: any[]): any[] {
    const seenLabels = new Set();
    return models
        .map(model => {
            const firstWord = model.Label.split(' ')[0]; // Extrai a primeira palavra do Label
            return { Label: firstWord };
        })
        .filter(model => {
            if (seenLabels.has(model.Label)) {
                return false; // Ignora se a primeira palavra já foi vista
            } else {
                seenLabels.add(model.Label);
                return true; // Mantém apenas o primeiro modelo com esta primeira palavra
            }
        });
}
