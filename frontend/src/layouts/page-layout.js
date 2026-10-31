export function renderPageLayout({body,header,navigation}) {
  return header+'<main class="content">'+body+'</main>'+navigation;
}
