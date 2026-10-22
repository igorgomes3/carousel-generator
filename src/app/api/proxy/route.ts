import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge"; // 'nodejs' is the default

export async function GET(request: NextRequest) {
  try {
    let url = new URL(request.url);
    let imageUrl = url.searchParams.get("url");

    if (!imageUrl) {
      return new NextResponse("URL Not provided", { status: 500 });
    }

    // Make a GET request to the external URL
    const { contentType, body } = await fetchExternalImageUrl(imageUrl);

    if (
      !(typeof contentType === "string") ||
      !contentType.startsWith("image")
    ) {
      return new NextResponse("Content type must be image", { status: 500 });
    }

    const headers = new Headers();
    // A exportacao busca as imagens daqui de dentro do navegador. Fixar a
    // origem em NEXT_PUBLIC_APP_URL quebra tudo quando a aplicacao e acessada
    // por outro nome (IP da rede interna, localhost): o navegador bloqueia a
    // leitura, a imagem nao vira data URL e a exportacao morre com
    // "Failed to create canvas", sem dizer o motivo. Nao ha credencial nesta
    // rota — ela apenas devolve uma imagem publica — entao liberar geral e seguro.
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Content-Type", contentType);
    // Return the response as-is
    return new NextResponse(body, {
      status: 200,
      statusText: "OK",
      headers,
    });
  } catch (error) {
    // Handle errors gracefully
    console.error("Proxy error:", error);
    return new NextResponse("Proxy error", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

async function fetchExternalImageUrl(imageUrl: string) {
  // TODO: Convert to server action
  const response = await fetch(imageUrl);
  const contentType = response.headers.get("Content-Type");
  if (typeof contentType === "string" && contentType.startsWith("image")) {
    response.body;
  }
  return { contentType, body: response.body };
}
