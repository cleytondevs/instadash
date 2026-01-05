import { Request, Response } from "express";

export const handleDataDeletion = async (req: Request, res: Response) => {
  // O Facebook envia um 'signed_request' que pode ser decodificado para obter o ID do usuário
  // Como nosso app é simplificado e não armazena dados persistentes de perfil,
  // apenas retornamos o link com as instruções de exclusão e o código de confirmação.
  
  const confirmationCode = `del_${Date.now()}`;
  const statusUrl = `https://instadashshopee.netlify.app/data-deletion?id=${confirmationCode}`;

  res.json({
    url: statusUrl,
    confirmation_code: confirmationCode
  });
};
