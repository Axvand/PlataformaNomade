document.addEventListener("DOMContentLoaded", () => {
  // Elementos do DOM
  const audioPlayer = document.getElementById("audio-player");
  const playBtn = document.getElementById("play-btn");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const progress = document.getElementById("progress");
  const progressBar = document.getElementById("progress-bar");
  const currentTimeEl = document.getElementById("current-time");
  const totalTimeEl = document.getElementById("total-time");
  const trackList = document.getElementById("track-list");
  const currentTrackName = document.getElementById("current-track-name");
  const currentArtist = document.getElementById("current-artist");
  const currentAlbumArt = document.getElementById("current-album-art");
  const downloadAlbumBtn = document.getElementById("download-album");

  // Estado do player
  let tracks = [];
  let currentTrackIndex = 0;
  let isPlaying = false;

  // Caminho para a capa padrão do álbum
  const defaultAlbumArt = "assets/Capa.png";

  // Função para carregar músicas da pasta "Musicas"
  function loadMusicasFolder() {
    // Array com os nomes dos arquivos da pasta "Musicas"
    const musicasFiles = [
      "1-Hey Maria.mp3",
      "2-Golpe.mp3",
      "3 -Letra G, Justica.mp3",
      "4-Velejar.mp3",
      "5-Ego.mp3",
      "6-Vai se f#der.mp3",
      "7-Avise.mp3",
    ];

    // Estrutura de dados para as músicas
    tracks = musicasFiles.map((filename) => {
      // Extrair o nome da música do nome do arquivo
      const title = filename.replace(".mp3", "");
      const filePath = `Musicas/${encodeURIComponent(filename)}`;
      console.log("Carregando arquivo:", filePath);

      return {
        title: title,
        artist: "Nômade", // Nome do artista
        album: "Sonho de Raça", // Nome do álbum
        duration: "0:00", // Será atualizado quando o arquivo for carregado
        file: filePath,
        albumArt: defaultAlbumArt,
        format: "MP3",
        fileName: filename,
      };
    });

    // Adicionar listener de erro no player
    audioPlayer.addEventListener("error", (e) => {
      console.error("Erro ao carregar áudio:", e);
      console.log("Arquivo atual:", audioPlayer.src);
      console.log("Código do erro:", audioPlayer.error.code);
      console.log("Mensagem do erro:", audioPlayer.error.message);
    });

    // Adicionar listener para debug quando uma faixa é selecionada
    audioPlayer.addEventListener("loadstart", () => {
      console.log("Iniciando carregamento do arquivo:", audioPlayer.src);
    });

    audioPlayer.addEventListener("canplay", () => {
      console.log("Arquivo pronto para tocar:", audioPlayer.src);
    });

    // Renderizar a lista de faixas
    renderTrackList();

    // Tentar pré-carregar as durações das músicas
    preloadDurations();

    // Selecionar a primeira faixa por padrão
    if (tracks.length > 0) {
      selectTrack(0);
    }
  }

  // Função para pré-carregar as durações das músicas
  function preloadDurations() {
    tracks.forEach((track, index) => {
      const audio = new Audio();

      audio.addEventListener("loadedmetadata", () => {
        tracks[index].duration = formatTime(audio.duration);
        // Atualizar a lista para mostrar a duração
        renderTrackList();
      });

      audio.addEventListener("error", () => {
        console.log(`Erro ao carregar: ${track.file}`);
      });

      audio.src = track.file;
    });
  }

  // Função para ler metadados de arquivos MP3 usando jsmediatags
  async function loadMetadata(file) {
    return new Promise((resolve, reject) => {
      // Usar jsmediatags para extrair metadados do arquivo MP3
      jsmediatags.read(file, {
        onSuccess: function (tag) {
          // Extrair dados das tags ID3
          const tags = tag.tags;

          // Processar a imagem da capa do álbum, se disponível
          let albumArtUrl = defaultAlbumArt;
          try {
            if (tags.picture) {
              const { data, format } = tags.picture;
              let base64String = "";
              for (let i = 0; i < data.length; i++) {
                base64String += String.fromCharCode(data[i]);
              }
              albumArtUrl = `data:${format};base64,${window.btoa(
                base64String
              )}`;
            }
          } catch (error) {
            console.error("Erro ao processar a capa do álbum:", error);
            albumArtUrl = defaultAlbumArt;
          }

          // Criar objeto com os metadados
          const metadata = {
            title: tags.title || file.name.replace(".mp3", ""),
            artist: tags.artist || "Sonho de Raça",
            album: tags.album || "Nômade",
            duration: "0:00", // Será atualizado quando o arquivo for carregado
            format: "MP3",
            albumArt: albumArtUrl,
          };

          resolve(metadata);
        },
        onError: function (error) {
          console.log("Erro ao ler metadados:", error);
          // Fallback para informações básicas
          resolve({
            title: file.name.replace(".mp3", ""),
            artist: "Sonho de Raça",
            album: "Nômade",
            duration: "0:00",
            format: "MP3",
            albumArt: defaultAlbumArt,
          });
        },
      });
    });
  }

  // Função para obter a duração real do arquivo de áudio
  async function getAudioDuration(file) {
    return new Promise((resolve) => {
      const audioEl = new Audio();
      audioEl.addEventListener("loadedmetadata", () => {
        resolve(formatTime(audioEl.duration));
      });

      // Para tratar erros ou arquivos não-suportados
      audioEl.addEventListener("error", () => {
        resolve("0:00");
      });

      audioEl.src = URL.createObjectURL(file);
    });
  }

  // Carregar múltiplos arquivos MP3 carregados pelo usuário
  async function handleFileUpload(files) {
    const fileArray = Array.from(files);
    const newTracks = [];

    for (const file of fileArray) {
      if (file.type.includes("audio")) {
        // Obter metadados e criar URL do objeto
        const metadata = await loadMetadata(file);
        const objectURL = URL.createObjectURL(file);

        // Obter duração real
        const duration = await getAudioDuration(file);
        metadata.duration = duration;

        newTracks.push({
          title: metadata.title,
          artist: metadata.artist,
          album: metadata.album,
          duration: metadata.duration,
          file: objectURL,
          albumArt: metadata.albumArt,
          format: metadata.format,
          originalFile: file, // Mantemos referência ao arquivo original para download
          fileName: file.name,
        });
      }
    }

    if (newTracks.length > 0) {
      tracks = newTracks;
      renderTrackList();
      selectTrack(0);
    }
  }

  // Adicionar suporte para drag and drop de arquivos MP3
  function initFileDragDrop() {
    const dropZone = document.querySelector(".app-container");

    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    ["dragenter", "dragover"].forEach((eventName) => {
      dropZone.addEventListener(eventName, highlight, false);
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
      dropZone.classList.add("highlight");
    }

    function unhighlight() {
      dropZone.classList.remove("highlight");
    }

    dropZone.addEventListener("drop", handleDrop, false);

    function handleDrop(e) {
      const dt = e.dataTransfer;
      const files = dt.files;
      handleFileUpload(files);
    }
  }

  // Adicionar botão para seleção de arquivos
  function createFileSelector() {
    const fileSelector = document.createElement("input");
    fileSelector.type = "file";
    fileSelector.multiple = true;
    fileSelector.accept = "audio/*";
    fileSelector.style.display = "none";
    document.body.appendChild(fileSelector);

    fileSelector.addEventListener("change", (e) => {
      handleFileUpload(e.target.files);
    });

    // Adicionar botão na interface

    const trackListContainer = document.querySelector(".track-list-container");
    trackListContainer.insertBefore(addButton, trackList);

    // Estilizar o botão
    addButton.style.background = "#594302";
    addButton.style.border = "1px solid #A67D03";
    addButton.style.color = "white";
    addButton.style.padding = "8px 15px";
    addButton.style.borderRadius = "20px";
    addButton.style.margin = "0 0 15px 0";
    addButton.style.cursor = "pointer";
    addButton.style.fontSize = "0.9rem";
    addButton.style.display = "flex";
    addButton.style.alignItems = "center";
    addButton.style.gap = "5px";

    addButton.addEventListener("mouseover", () => {
      addButton.style.background = "#A67D03";
    });

    addButton.addEventListener("mouseout", () => {
      addButton.style.background = "#594302";
    });
  }

  // Converter segundos para formato MM:SS
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }

  // Renderizar lista de faixas
  function renderTrackList() {
    trackList.innerHTML = "";

    tracks.forEach((track, index) => {
      const li = document.createElement("li");
      li.className = `track-item ${
        index === currentTrackIndex && isPlaying ? "active" : ""
      }`;
      li.setAttribute("data-index", index);

      li.innerHTML = `
                <div class="track-info">
                    <div class="track-name">${track.title}</div>
                    <div class="track-meta">${track.artist} • ${
        track.album
      } • ${track.format}</div>
                </div>
                <div class="track-duration">${track.duration}</div>
                <button class="play-track-btn">
                    <i class="fas ${
                      index === currentTrackIndex && isPlaying
                        ? "fa-pause"
                        : "fa-play"
                    }"></i>
                </button>
            `;

      li.addEventListener("click", (e) => {
        // Verificar se o clique foi no botão de play ou em qualquer outra parte do item
        if (!e.target.closest(".play-track-btn")) {
          selectTrack(index);
          playTrack();
        } else {
          if (currentTrackIndex === index) {
            togglePlay();
          } else {
            selectTrack(index);
            playTrack();
          }
        }
      });

      trackList.appendChild(li);
    });
  }

  // Selecionar faixa
  function selectTrack(index) {
    if (index < 0) index = tracks.length - 1;
    if (index >= tracks.length) index = 0;

    currentTrackIndex = index;
    audioPlayer.src = tracks[index].file;

    // Atualizar a interface
    currentTrackName.textContent = tracks[index].title;
    currentArtist.textContent = tracks[index].artist;
    currentAlbumArt.src = tracks[index].albumArt;

    // Marcar a faixa ativa na lista
    document.querySelectorAll(".track-item").forEach((item, i) => {
      if (i === index) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }

  // Reproduzir faixa atual
  function playTrack() {
    audioPlayer.play();
    isPlaying = true;
    playBtn.innerHTML = '<i class="fas fa-pause"></i>';
    updatePlayIcons();
  }

  // Pausar faixa atual
  function pauseTrack() {
    audioPlayer.pause();
    isPlaying = false;
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
    updatePlayIcons();
  }

  // Alternar entre play e pause
  function togglePlay() {
    if (isPlaying) {
      pauseTrack();
    } else {
      playTrack();
    }
  }

  // Atualizar ícones de play na lista
  function updatePlayIcons() {
    document.querySelectorAll(".track-item").forEach((item, index) => {
      const playBtn = item.querySelector(".play-track-btn i");
      if (index === currentTrackIndex && isPlaying) {
        playBtn.className = "fas fa-pause";
      } else {
        playBtn.className = "fas fa-play";
      }
    });
  }

  // Próxima faixa
  function nextTrack() {
    selectTrack(currentTrackIndex + 1);
    if (isPlaying) playTrack();
  }

  // Faixa anterior
  function prevTrack() {
    selectTrack(currentTrackIndex - 1);
    if (isPlaying) playTrack();
  }

  // Atualizar barra de progresso
  function updateProgress() {
    const { currentTime, duration } = audioPlayer;
    if (duration) {
      const progressPercent = (currentTime / duration) * 100;
      progress.style.width = `${progressPercent}%`;
      currentTimeEl.textContent = formatTime(currentTime);
      totalTimeEl.textContent = formatTime(duration);
    } else {
      progress.style.width = "0%";
      currentTimeEl.textContent = "0:00";
      totalTimeEl.textContent = "0:00";
    }
  }

  // Definir progresso da música ao clicar na barra
  function setProgress(e) {
    const width = this.clientWidth;
    const clickX = e.offsetX;
    const duration = audioPlayer.duration;
    const newTime = (clickX / width) * duration;
    audioPlayer.currentTime = newTime;
  }

  // Função de download do álbum
  function downloadAlbum() {
    if (tracks.length === 0) {
      alert("Não há músicas para baixar.");
      return;
    }

    // Para músicas da pasta Musicas
    tracks.forEach((track) => {
      if (track.fileName) {
        const a = document.createElement("a");
        a.href = track.file;
        a.download = track.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    });
  }

  // Adicionar estilo para highlight durante drag&drop
  function addHighlightStyle() {
    const style = document.createElement("style");
    style.innerHTML = `
            .app-container.highlight {
                border: 3px dashed #592B02;
                background-color: rgba(89, 43, 2, 0.1);
            }
        `;
    document.head.appendChild(style);
  }

  // Event listeners
  playBtn.addEventListener("click", togglePlay);
  prevBtn.addEventListener("click", prevTrack);
  nextBtn.addEventListener("click", nextTrack);

  audioPlayer.addEventListener("timeupdate", updateProgress);
  progressBar.addEventListener("click", setProgress);

  audioPlayer.addEventListener("ended", nextTrack);

  downloadAlbumBtn.addEventListener("click", downloadAlbum);

  // Inicialização
  addHighlightStyle();
  loadMusicasFolder();
  initFileDragDrop();
  createFileSelector();
});
