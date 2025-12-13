
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// copy from index.html
const firebaseConfig = {
    apiKey: "AIzaSyBU0dNMAXOfToiJ2VU0Gp1Y2v6mFGjQeZo",
    authDomain: "siatec-a88de.firebaseapp.com",
    projectId: "siatec-a88de",
    storageBucket: "siatec-a88de.firebasestorage.app",
    messagingSenderId: "558101434635",
    appId: "1:558101434635:web:38347725aa168e7587520e",
    measurementId: "G-ZZ274STXJ7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const productsTableBody = document.getElementById('products-table-body');
const addProductBtn = document.getElementById('add-product-btn');
const productModal = document.getElementById('product-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const productForm = document.getElementById('product-form');
const migrateBtn = document.getElementById('migrate-btn');
const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');
const submitBtnText = document.getElementById('submit-btn-text');

let isLoginMode = true;

// --- AUTHENTICATION ---

toggleAuthModeBtn.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
        document.querySelector('#login-section h2').textContent = "Iniciar Sesión";
        submitBtnText.textContent = "Entrar";
        toggleAuthModeBtn.innerHTML = '¿No tienes cuenta? <span class="text-accent-blue font-bold">Regístrate</span>';
    } else {
        document.querySelector('#login-section h2').textContent = "Registrar Administrador";
        submitBtnText.textContent = "Registrarse";
        toggleAuthModeBtn.innerHTML = '¿Ya tienes cuenta? <span class="text-accent-blue font-bold">Inicia Sesión</span>';
    }
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        loginSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        loadProducts();
    } else {
        loginSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
        logoutBtn.classList.add('hidden');
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
        }
        loginError.classList.add('hidden');
    } catch (error) {
        console.error("Auth failed", error);
        loginError.textContent = "Error: " + error.message;
        loginError.classList.remove('hidden');
    }
});

logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// --- PRODUCT MANAGEMENT ---

let products = [];
let editingProductId = null;

async function loadProducts() {
    productsTableBody.innerHTML = '<tr><td colspan="5" class="text-center p-4">Cargando...</td></tr>';
    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        products = [];
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });
        renderProductsTable();
    } catch (error) {
        console.error("Error loading products:", error);
        productsTableBody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-red-500">Error al cargar productos</td></tr>';
    }
}

function renderProductsTable() {
    productsTableBody.innerHTML = '';

    // Sort: Offers first
    products.sort((a, b) => (b.isOnOffer === true) - (a.isOnOffer === true));

    products.forEach(product => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-800 transition';
        tr.innerHTML = `
            <td class="p-4"><img src="${product.image}" class="w-12 h-12 object-cover rounded"></td>
            <td class="p-4 font-semibold">${product.name}</td>
            <td class="p-4">$${product.price}</td>
            <td class="p-4">
                ${product.isOnOffer
                ? `<span class="bg-red-900 text-red-200 text-xs px-2 py-1 rounded-full">Oferta (${product.discountPercentage || 'N/A'})</span>`
                : '<span class="text-gray-500">-</span>'}
            </td>
            <td class="p-4 flex gap-2">
                <button class="text-accent-blue hover:text-white" onclick="window.editProduct('${product.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="text-red-500 hover:text-red-400" onclick="window.deleteProduct('${product.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        productsTableBody.appendChild(tr);
    });
}

// Global functions for inline onclick
window.editProduct = (id) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    editingProductId = id;
    document.getElementById('modal-title').textContent = "Editar Producto";

    document.getElementById('p-name').value = product.name;
    document.getElementById('p-price').value = product.price;
    document.getElementById('p-original-price').value = product.originalPrice || '';
    document.getElementById('p-stock').value = product.stock || 0;
    document.getElementById('p-description').value = product.description;
    document.getElementById('p-image').value = product.image;
    document.getElementById('p-images').value = product.images ? product.images.join(',') : '';
    document.getElementById('p-offer').checked = product.isOnOffer || false;
    document.getElementById('p-discount').value = product.discountPercentage || '';

    toggleDiscountInput();
    productModal.classList.remove('hidden');
};

window.deleteProduct = async (id) => {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return;
    try {
        await deleteDoc(doc(db, "products", id));
        loadProducts(); // Reload
    } catch (error) {
        alert("Error al eliminar: " + error.message);
    }
};

// Modal Logic
addProductBtn.addEventListener('click', () => {
    editingProductId = null;
    document.getElementById('modal-title').textContent = "Nuevo Producto";
    productForm.reset();
    toggleDiscountInput();
    productModal.classList.remove('hidden');
});

closeModalBtn.addEventListener('click', () => {
    productModal.classList.add('hidden');
});

document.getElementById('p-offer').addEventListener('change', toggleDiscountInput);

function toggleDiscountInput() {
    const isOffer = document.getElementById('p-offer').checked;
    const discountInput = document.getElementById('p-discount');
    if (isOffer) {
        discountInput.classList.remove('hidden');
    } else {
        discountInput.classList.add('hidden');
    }
}

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const productData = {
        name: document.getElementById('p-name').value,
        price: parseFloat(document.getElementById('p-price').value),
        originalPrice: parseFloat(document.getElementById('p-original-price').value) || 0,
        stock: parseInt(document.getElementById('p-stock').value) || 0,
        description: document.getElementById('p-description').value,
        image: document.getElementById('p-image').value,
        images: document.getElementById('p-images').value.split(',').map(s => s.trim()).filter(s => s),
        isOnOffer: document.getElementById('p-offer').checked,
        discountPercentage: document.getElementById('p-discount').value,
        updatedAt: serverTimestamp()
    };

    try {
        if (editingProductId) {
            await updateDoc(doc(db, "products", editingProductId), productData);
        } else {
            productData.createdAt = serverTimestamp();
            await addDoc(collection(db, "products"), productData);
        }
        productModal.classList.add('hidden');
        loadProducts();
    } catch (error) {
        console.error("Error saving product:", error);
        alert("Error al guardar: " + error.message);
    }
});

// --- MIGRATION LOGIC ---

// Hardcoded products from index.html (Source of truth)
const initialProducts = [
    {
        name: 'Lenovo Ultra Thinkpad E16 G2',
        originalPrice: 31888.88,
        price: 28700,
        description: 'Gama Media <br> Procesador: Intel Core Ultra 7 155H <br> Ram: 16 GB DDR5 <br> Almacenamiento: 512  GB SSD NVME <br> Display: 16” Full HD <br> GPU: Intel Arc <br> Sistema Operativo: Windows 11.',
        image: 'https://p1-ofp.static.pub//medias/26365099349_E16G2_202403011025391713718517478.png',
        images: [
            'https://p1-ofp.static.pub//medias/26365099349_E16G2_202403011025391713718517478.png',
            'https://placehold.co/800x600/FF5733/FFFFFF?text=Lenovo+E16+G2+Vista+Lateral',
            'https://placehold.co/800x600/33FF57/FFFFFF?text=Lenovo+E16+G2+Teclado'
        ],
        stock: 5,
        isOnOffer: true,
        discountPercentage: '10%'
    },
    {
        name: 'Lenovo ThinkPad P1 G3',
        originalPrice: 24375.00,
        price: 19500.00,
        description: 'Gama Alta <br> Procesador: Intel Xeon® W-10855M vPro <br> Ram: 16 GB DDR4 <br> Almacenamiento: 1 TB SSD NVME <br> Display: 15.6” FHD <br> GPU: NVIDIA® T2000 de 4GB <br> Sistema Operativo: Windows 11.',
        image: 'https://p1-ofp.static.pub/medias/bWFzdGVyfHJvb3R8Mjg5ODU4fGltYWdlL3BuZ3xoYWIvaGM5LzE0MTEwNjE3MDc1NzQyLnBuZ3w0MThjNDY4MjdkMzUyY2RiZTIwMDZkOTdkZWYxZTQyNWRjNTJlNDIyYThjMmYwNDUwZjk4YWQ4Njc1MWMzZDM1/22WS2P1P1N3.png',
        images: [
            'https://p1-ofp.static.pub/medias/bWFzdGVyfHJvb3R8Mjg5ODU4fGltYWdlL3puZ3xoYWIvaGM5LzE0MTEwNjE3MDc1NzQyLnBuZ3w0MThjNDY4MjdkMzUyY2RiZTIwMDZkOTdkZWYxZTQyNWRjNTJlNDIyYThjMmYwNDUwZjk4YWQ4Njc1MWMzZDM1/22WS2P1P1N3.png',
            'https://placehold.co/800x600/3366FF/FFFFFF?text=Lenovo+P1+G3+Ángulo',
            'https://placehold.co/800x600/FFFF33/333333?text=Lenovo+P1+G3+Abierta'
        ],
        stock: 3,
        isOnOffer: true,
        discountPercentage: '20%'
    },
    {
        name: 'Lenovo ThinkPad T480s',
        originalPrice: 13800.00,
        price: 11500.00,
        description: 'Gama Media <br> Procesador: Intel Core i7-8650U <br> Ram: 24 GB DDR4 <br> Almacenamiento: 256  GB SSD <br> Display: 14” Full HD <br> GPU: Intel UHD Graphics 620 <br> Sistema Operativo: Windows 10 Pro.',
        image: 'https://p1-ofp.static.pub/medias/bWFzdGVyfC9lbWVhL2ltYWdlcy98NjYwMTd8aW1hZ2UvcG5nfC9lbWVhL2ltYWdlcy9oNWIvaDUzLzk2OTEwMjU4MzQwMTQucG5nfDUxM2UxYzc5ZThjYjVmZjAxMjA2OTFlYTQ3ZWY5MDUxNDczNTllOWIzMzRmNjJmOGM5NjM2MzIyYzJiNWQwNWI/thinkpad-t480s-400x300prod.png',
        images: [
            'https://p1-ofp.static.pub/medias/bWFzdGVyfC9lbWVhL2ltYWdlcy98NjYwMTd8aW1hZ2UvcG5nfC9lbWVhL2ltYWdlcy9oNWIvaDUzLzk2OTEwMjU4MzQwMTQucG5nfDUxM2UxYzc5ZThjYjVmZjAxMjA2OTFlYTQ3ZWY5MDUxNDczNTllOWIzMzRmNjJmOGM5NjM2MzIyYzJiNWQwNWI/thinkpad-t480s-400x300prod.png',
            'https://placehold.co/800x600/CC33FF/FFFFFF?text=Lenovo+T480s+Detalle+1',
            'https://placehold.co/800x600/FF33CC/FFFFFF?text=Lenovo+T480s+Detalle+2'
        ],
        stock: 7,
        isOnOffer: true,
        discountPercentage: '20%'
    },
    {
        name: 'Dell Latitude 7420 Touch',
        originalPrice: 13625,
        price: 10900.00,
        description: 'Gama Media <br> Procesador:  Intel Core i7-1185G7 <br> Ram: 16 GB DDR4 <br> Almacenamiento: 512 GB SSD Nvme <br> Display: 14" Full HD <br> GPU: Intel UHD Graphics 620 <br> Sistema Operativo: Windows 10 pro.',
        image: 'https://m.media-amazon.com/images/I/81zApF7wp4L._AC_SL1500_.jpg',
        images: [
            'https://m.media-amazon.com/images/I/81zApF7wp4L._AC_SL1500_.jpg',
            'https://placehold.co/800x600/AACCFF/000000?text=Dell+7420+Touch+Vista+Superior',
            'https://placehold.co/800x600/FFCCAA/000000?text=Dell+7420+Touch+Plegada'
        ],
        stock: 7,
        isOnOffer: true,
        discountPercentage: '20%'
    },
    {
        name: 'Lenovo ThinkPad P15s G1',
        price: 18500.00,
        description: 'Gama Alta  <br> Procesador: Intel Core i7-10510U <br> Ram: 16 GB DDR4 <br> Almacenamiento: 512 GB SSD <br> Display: 15.6” Full HD <br> GPU: NVIDIA Quadro P520 de 2 GB <br> Sistema Operativo: Windows 11.',
        image: 'https://p1-ofp.static.pub/medias/bWFzdGVyfHJvb3R8MjU1Nzk3fGltYWdlL2pwZWd8aGJhL2hkZC8xMDg0NTAyNjE1NjU3NC5qcGd8NmY1Mjc4MjhiNWE4ZTAyZGMzZDRiMGYzMGZiNzNlNWUyMDAzOTg4ZjUxYWUzYmQ3NGRlZGQyZTJhMGRhMWM4Ng/lenovo-laptop-thinkpad-P15s-gallery-2.jpg',
        images: [
            'https://p1-ofp.static.pub/medias/bWFzdGVyfHJvb3R8MjU1Nzk3fGltYWdlL2pwZWd8aGJhL2hkZC8xMDg0NTAyNjE1NjU3NC5qcGd8NmY1Mjc4MjhiNWE4ZTAyZGMzZDRiMGYzMGZiNzNlNWUyMDAzOTg4ZjUxYWUzYmQ3NGRlZGQyZTJhMGRhMWM4Ng/lenovo-laptop-thinkpad-P15s-gallery-2.jpg'
        ],
        stock: 4,
        isOnOffer: false
    },
    {
        name: 'Dell Latitude 7330 Touch 2 en 1',
        price: 11000.00,
        description: 'Gama Media  <br> Procesador: Intel core i7-1265U <br> Ram: 16 GB DDR4 <br> Almacenamiento: 256 GB SSD Nvme <br> Display: 13,3" Full HD <br> GPU: Intel Iris Xe Graphics <br> Sistema Operativo: Windows 11.',
        image: 'https://m.media-amazon.com/images/I/61v3GfK7W9L._AC_SL1000_.jpg',
        images: [
            'https://m.media-amazon.com/images/I/61v3GfK7W9L._AC_SL1000_.jpg'
        ],
        stock: 6,
        isOnOffer: false
    },
    {
        name: 'Dell G15 5520 Gaming',
        price: 18900.00,
        description: 'Gama Alta <br> Procesador: Intel Core i7 12700H <br> Ram: 32 GB DDR5 <br> Almacenamiento: 512 GB SSD <br> Display: 15.6” Full HD 120 hz <br> GPU: NVIDIA RTX 3060 6GB <br> Sistema Operativo: Windows 11.',
        image: 'https://i.ebayimg.com/images/g/R7UAAOSwLL1n8~br/s-l1600.webp',
        images: [
            'https://i.ebayimg.com/images/g/R7UAAOSwLL1n8~br/s-l1600.webp'
        ],
        stock: 8,
        isOnOffer: false
    },
    {
        name: 'Dell Latitude 5420 ',
        price: 7200.00,
        description: 'Gama Media <br> Procesador: Intel Core i5-12450H <br> Ram: 16 GB DDR4 <br> Almacenamiento: 256 GB SSD Nvme  <br> Display: 14" Full HD  <br> GPU: Intel UHD Graphics 620 <br> Sistema Operativo: Windows 10 pro.',
        image: 'https://m.media-amazon.com/images/I/51pMLgaqblL._AC_SL1000_.jpg',
        images: [
            'https://m.media-amazon.com/images/I/51pMLgaqblL._AC_SL1000_.jpg',
            'https://placehold.co/800x600/FFCC00/FFFFFF?text=Dell+Latitude+5420+Vista+Lateral',
            'https://placehold.co/800x600/00FFCC/FFFFFF?text=Dell+Latitude+5420+Teclado'
        ],
        stock: 8,
        isOnOffer: false
    },
    {
        name: 'Dell Latitude 7490',
        price: 5800.00,
        description: 'Gama Media <br> Procesador: Intel Core i5-8250U <br> Ram: 8GB DDR4 <br> Almacenamiento: 256 GB SSD Nvme <br> Display: 14" Full HD <br> GPU: Intel UHD Graphics 620 <br> Sistema Operativo: Windows 10 pro.',
        image: 'https://i.ibb.co/mrj3R19C/Photo-Room-20250607-141610.png',
        images: [
            'https://i.ibb.co/mrj3R19C/Photo-Room-20250607-141610.png'
        ],
        stock: 10,
        isOnOffer: false
    },
    {
        name: 'Dell Latitude 5500 Touch',
        price: 6900.00,
        description: 'Gama Media <br> Procesador: Intel Core i5-8365U <br> Ram: 16 GB DDR4 <br> Almacenamiento: 256 GB SSD Nvme <br> Display: 15,6" Full HD <br> GPU: Intel UHD Graphics 620 <br> Sistema Operativo: Windows 10 pro.',
        image: 'https://m.media-amazon.com/images/I/51EWAGvEjWL._AC_SL1500_.jpg',
        images: [
            'https://m.media-amazon.com/images/I/51EWAGvEjWL._AC_SL1500_.jpg'
        ],
        stock: 10,
        isOnOffer: false
    },
    {
        name: 'Licencia Windows 10 Pro (ESD)',
        price: 450.00,
        description: 'Licencia digital para Windows 10 Pro. Ideal para usuarios empresariales y avanzados. Activación instantánea.',
        image: 'https://i.ibb.co/NnCMHzfp/w10-pro.png',
        images: ['https://i.ibb.co/NnCMHzfp/w10-pro.png'],
        stock: 99,
        isOnOffer: false
    },
    {
        name: 'Licencia Windows 11 Pro (ESD)',
        price: 650.00,
        description: 'Licencia digital para Windows 11 Pro. Disfruta de la última experiencia Windows con seguridad y características mejoradas.',
        image: 'https://i.ibb.co/TBc9G54q/w-11-pro.png',
        images: ['https://i.ibb.co/TBc9G54q/w-11-pro.png'],
        stock: 99,
        isOnOffer: false
    },
    {
        name: 'Microsoft Office Pro Plus 2021 (ESD)',
        price: 450.00,
        description: 'Licencia digital para Microsoft Office Pro Plus 2021. Incluye Word, Excel, PowerPoint y más. Activación instantánea.',
        image: 'https://i.ibb.co/LdbrR6Zq/office-2021.png',
        images: ['https://i.ibb.co/LdbrR6Zq/office-2021.png'],
        stock: 99,
        isOnOffer: false
    },
    {
        name: 'Microsoft Office Pro Plus 2024 (ESD)',
        price: 600.00,
        description: 'Licencia digital para Microsoft Office Pro Plus 2024. Incluye las últimas versiones de Word, Excel, PowerPoint y más. Activación instantánea.',
        image: 'https://i.ibb.co/7JpSs8Tg/office-2024.png',
        images: ['https://i.ibb.co/7JpSs8Tg/office-2024.png'],
        stock: 99,
        isOnOffer: false
    },
    {
        name: ' ESET NOD32 (2 AÑOS) (ESD)',
        price: 650.00,
        description: 'Antivirus ESET NOD32 para 2 años. Protección avanzada contra malware, ransomware y amenazas en línea. Licencia digital.',
        image: 'https://live.staticflickr.com/5123/5200939230_8d86ba71cb_z.jpg',
        images: ['https://live.staticflickr.com/5123/5200939230_8d86ba71cb_z.jpg'],
        stock: 99,
        isOnOffer: false
    }
];

migrateBtn.addEventListener('click', async () => {
    if (!confirm("¿Estás seguro de migrar los datos? Esto podría duplicar productos si ya existen. Asegúrate de que la colección 'products' esté vacía o sepas lo que haces.")) return;

    migrateBtn.disabled = true;
    migrateBtn.textContent = "Migrando...";

    let count = 0;
    for (const prod of initialProducts) {
        try {
            await addDoc(collection(db, "products"), {
                ...prod,
                createdAt: serverTimestamp()
            });
            count++;
        } catch (e) {
            console.error("Fallo al migrar:", prod.name, e);
        }
    }

    alert(`Migración completada. ${count} productos añadidos.`);
    migrateBtn.textContent = "Datos Migrados";
    loadProducts();
});
