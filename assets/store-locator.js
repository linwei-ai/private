function loadGoogleMapsApi(apiKey) {
  if (window.google?.maps) return Promise.resolve();
  if (!apiKey) return Promise.reject(new Error("No hay API key de Google Maps."));

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function normalizeText(value) {
  return String(value || "").trim();
}

function createInfoWindowContent(store) {
  return `
    <div class="store-locator__info">
      <h3 class="store-locator__info-title">${store.name}</h3>
      <div class="store-locator__info-body">
        <p><strong>Direccion:</strong> ${store.address}</p>
        <p><strong>Departamento:</strong> ${store.department || "N/A"}</p>
        <p><strong>Ciudad:</strong> ${store.city}</p>
        <p><strong>Contacto:</strong> ${store.phone}</p>
      </div>
      <a class="store-locator__info-link" href="https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lng}" target="_blank" rel="noopener noreferrer">Ver en Google Maps</a>
    </div>
  `;
}

function renderStoreList(container, stores, onSelectStore) {
  const list = document.createElement("ul");
  list.className = "store-locator__list";

  stores.forEach((store, index) => {
    const item = document.createElement("li");
    item.className = "store-list-item";
    item.dataset.index = String(index);
    item.innerHTML = `
      <strong>${store.name}</strong>
      <p><strong>Direccion:</strong> ${store.address}</p>
      <p><strong>Departamento:</strong> ${store.department || "N/A"}</p>
      <p><strong>Ciudad:</strong> ${store.city}</p>
      <p><strong>Contacto:</strong> ${store.phone}</p>
    `;

    item.addEventListener("click", () => onSelectStore(index));
    list.appendChild(item);
  });

  container.innerHTML = "";
  container.appendChild(list);
}

function buildFilterOptions(stores) {
  const departments = [...new Set(stores.map((store) => normalizeText(store.department)).filter(Boolean))].sort();
  const cities = [...new Set(stores.map((store) => normalizeText(store.city)).filter(Boolean))].sort();
  return { departments, cities };
}

function renderFilters(scopeElement, stores, onFilterChange) {
  const filtersContainer = scopeElement.querySelector(".location-options-container");
  if (!filtersContainer) return;

  const { departments, cities } = buildFilterOptions(stores);
  const departmentSelect = document.createElement("select");
  const citySelect = document.createElement("select");
  departmentSelect.className = "store-locator__select";
  citySelect.className = "store-locator__select";

  const departmentPlaceholder = document.createElement("option");
  departmentPlaceholder.value = "";
  departmentPlaceholder.textContent = "Departamento";
  departmentSelect.appendChild(departmentPlaceholder);

  departments.forEach((department) => {
    const option = document.createElement("option");
    option.value = department;
    option.textContent = department;
    departmentSelect.appendChild(option);
  });

  const cityPlaceholder = document.createElement("option");
  cityPlaceholder.value = "";
  cityPlaceholder.textContent = "Ciudad";
  citySelect.appendChild(cityPlaceholder);

  cities.forEach((city) => {
    const option = document.createElement("option");
    option.value = city;
    option.textContent = city;
    citySelect.appendChild(option);
  });

  departmentSelect.addEventListener("change", () => {
    const selectedDepartment = normalizeText(departmentSelect.value);
    const filteredCities = [...new Set(stores
      .filter((store) => !selectedDepartment || normalizeText(store.department) === selectedDepartment)
      .map((store) => normalizeText(store.city))
      .filter(Boolean))].sort();

    citySelect.innerHTML = "";
    const resetCityOption = document.createElement("option");
    resetCityOption.value = "";
    resetCityOption.textContent = "Ciudad";
    citySelect.appendChild(resetCityOption);

    filteredCities.forEach((city) => {
      const option = document.createElement("option");
      option.value = city;
      option.textContent = city;
      citySelect.appendChild(option);
    });

    onFilterChange(selectedDepartment, "");
  });

  citySelect.addEventListener("change", () => {
    onFilterChange(normalizeText(departmentSelect.value), normalizeText(citySelect.value));
  });

  filtersContainer.innerHTML = "";
  filtersContainer.appendChild(departmentSelect);
  filtersContainer.appendChild(citySelect);
}

function setupStoreLocator(scopeElement, data, mapEnabled) {
  const mapElement = scopeElement.querySelector(".map-container");
  const storesContainer = scopeElement.querySelector("#stores");
  if (!storesContainer) return;

  const stores = Array.isArray(data?.stores) ? data.stores : [];
  if (!stores.length) {
    storesContainer.innerHTML = "<p>No hay tiendas configuradas.</p>";
    return;
  }

  let map;
  let infoWindow;
  let markers = [];
  let filteredStores = [...stores];

  if (mapEnabled && mapElement && window.google?.maps) {
    const defaultCenter = data?.defaultCenter || { lat: 3.4516, lng: -76.532 };
    map = new google.maps.Map(mapElement, {
      center: defaultCenter,
      zoom: 12,
      mapTypeControl: false
    });

    infoWindow = new google.maps.InfoWindow();
  }

  function highlightStore(index) {
    const items = storesContainer.querySelectorAll(".store-list-item");
    items.forEach((item, itemIndex) => {
      item.classList.toggle("active", itemIndex === index);
    });
  }

  function selectStore(index) {
    const marker = markers[index];
    const hasMap = Boolean(map && marker && infoWindow);
    if (!hasMap) {
      highlightStore(index);
      return;
    }

    const store = filteredStores[index];
    infoWindow.setContent(createInfoWindowContent(store));
    infoWindow.open({ map, anchor: marker });
    map.setCenter(marker.getPosition());
    map.setZoom(15);
    highlightStore(index);
  }

  function renderMarkers(activeStores) {
    markers.forEach((marker) => marker.setMap(null));
    markers = [];
    if (!map) return;

    markers = activeStores.map((store, index) => {
      const marker = new google.maps.Marker({
        position: { lat: Number(store.lat), lng: Number(store.lng) },
        map,
        title: store.name
      });

      marker.addListener("click", () => {
        infoWindow.setContent(createInfoWindowContent(store));
        infoWindow.open({ map, anchor: marker });
        map.setCenter(marker.getPosition());
        map.setZoom(15);
        highlightStore(index);
      });

      return marker;
    });

    if (markers.length) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach((marker) => bounds.extend(marker.getPosition()));
      map.fitBounds(bounds);
      if (markers.length === 1) map.setZoom(15);
    }
  }

  function applyFilters(departmentValue, cityValue) {
    filteredStores = stores.filter((store) => {
      const departmentMatch = !departmentValue || normalizeText(store.department) === departmentValue;
      const cityMatch = !cityValue || normalizeText(store.city) === cityValue;
      return departmentMatch && cityMatch;
    });

    if (!filteredStores.length) {
      storesContainer.innerHTML = "<p>No hay tiendas para los filtros seleccionados.</p>";
      renderMarkers([]);
      return;
    }

    renderStoreList(storesContainer, filteredStores, selectStore);
    renderMarkers(filteredStores);
  }

  renderFilters(scopeElement, stores, applyFilters);
  applyFilters("", "");
}

async function initStoreLocator() {
  const locatorElement = document.querySelector("[data-store-locator]");
  if (!locatorElement) return;

  const storesUrl = locatorElement.dataset.storesUrl;
  const googleMapsKey = locatorElement.dataset.googleMapsKey;

  try {
    const response = await fetch(storesUrl, { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo cargar storesInfo.json");
    const storesData = await response.json();

    let mapEnabled = true;
    try {
      await loadGoogleMapsApi(googleMapsKey);
    } catch (mapError) {
      mapEnabled = false;
      console.warn("Google Maps no cargo. Se muestra solo el listado de tiendas.", mapError);
    }

    setupStoreLocator(locatorElement, storesData, mapEnabled);
  } catch (error) {
    console.error("Error inicializando Store Locator:", error);
    const storesContainer = locatorElement.querySelector("#stores");
    if (storesContainer) {
      storesContainer.innerHTML = "<p>No fue posible cargar las tiendas configuradas.</p>";
    }
  }
}

document.addEventListener("DOMContentLoaded", initStoreLocator);
